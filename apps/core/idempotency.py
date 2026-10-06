"""
Spec sections 32-33 - real, server-side protection for sensitive
actions (pay, withdraw, confirm delivery, request refund, approve...).

A disabled button is a UX nicety, not a safeguard - it does nothing
against a slow double-click, a retried request after a dropped
response, or someone replaying a captured request. These two decorators
are the actual enforcement, applied at the view.

Both are built on Django's cache framework (`cache.add`/`cache.incr`,
which are atomic - safe under concurrent requests, unlike a plain
get-then-set). With no CACHES setting configured, Django defaults to
LocMemCache, which is per-process - fine for local dev and a single-
process deployment, but NOT shared across multiple app server
processes/machines. For a real multi-process production deployment,
point CACHES at something shared (Redis, Memcached) - these decorators
need no code changes to pick that up, since they only ever go through
the cache API.
"""

from functools import wraps

from django.contrib import messages
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import redirect


def _wants_json(request):
    return request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", "")



def wants_json_response(request):
    return (
        request.headers.get("Accept", "").lower().find("application/json") >= 0
        or request.headers.get("X-Requested-With") == "XMLHttpRequest"
    )




def idempotent_post(key_func, ttl_seconds=15, message="This is already being processed - please wait a moment."):
    """
    Blocks a second identical POST that arrives while the first is
    still being handled (double-click, slow network + retry, etc.).
    `key_func(request, *args, **kwargs)` must return something unique
    to "this exact action, by this exact actor" - e.g. the order
    reference + user id for a payment, or the refund id for a refund
    action. Only wraps POST; GET/HEAD pass through untouched.

    This is a short-lived duplicate-submission guard, not a general
    "you can only do this once ever" rule - the lock releases as soon
    as the view finishes (success or failure), and a real second
    attempt a few seconds later is allowed through normally. Business
    rules about repeatability belong in the service layer (e.g.
    apps.orders.services.refunds already refuses a second refund
    request for an item with one already active, or a second approval
    of an already-approved refund) - this only stops the same click
    from firing the view twice.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if request.method != "POST":
                return view_func(request, *args, **kwargs)

            key = f"idempotency:{key_func(request, *args, **kwargs)}"
            if not cache.add(key, True, timeout=ttl_seconds):
                if _wants_json(request):
                    return JsonResponse({"error": message}, status=409)
                messages.warning(request, message)
                return redirect(request.META.get("HTTP_REFERER", "/"))

            try:
                return view_func(request, *args, **kwargs)
            finally:
                cache.delete(key)

        return wrapper
    return decorator


def rate_limit(key_func, limit=10, window_seconds=60, message="Too many attempts - please try again shortly."):
    """
    Fixed-window rate limit (not sliding - simple and enough for basic
    abuse protection, not built for split-second precision). Applies to
    every request the view receives, not just POST - a search or filter
    endpoint hit too fast is exactly what this is also for.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            import time
            identity = key_func(request, *args, **kwargs)
            bucket = int(time.time() // window_seconds)
            cache_key = f"ratelimit:{identity}:{bucket}"

            count = cache.get(cache_key)
            if count is None:
                cache.set(cache_key, 1, timeout=window_seconds)
            elif count >= limit:
                if _wants_json(request):
                    return JsonResponse({"error": message}, status=429)
                messages.error(request, message)
                return redirect(request.META.get("HTTP_REFERER", "/"))
            else:
                cache.incr(cache_key)

            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


def user_action_key(request, *args, **kwargs):
    """Common key_func: this user + this exact URL path - good enough for most sensitive-action views."""
    user_id = request.user.id if request.user.is_authenticated else request.META.get("REMOTE_ADDR", "anon")
    return f"{user_id}:{request.path}"

