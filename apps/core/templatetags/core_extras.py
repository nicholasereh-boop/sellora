from django import template

register = template.Library()


@register.filter
def zip_lists(labels, values):
    """
    Pairs up a chart's labels/values (the {"labels": [...], "values": [...]}
    shape used everywhere - apps.sellers.analytics, apps.affiliates.services.
    affiliate_analytics, etc.) so a template can render them as a normal
    accessible <table>, not just feed them to Chart.js. Silently returns
    an empty list on a length mismatch rather than raising - a chart
    that can't get an accessible table is a smaller problem than a
    broken page.
    """
    if not labels or not values or len(labels) != len(values):
        return []
    return zip(labels, values)


@register.inclusion_tag("core/_chart_table.html")
def chart_data_table(chart_id, title, labels, values, value_label="Value"):
    """
    Spec section 37 - "accessible chart summaries" and "alternative data
    views for charts". Every Chart.js canvas in the app should be
    followed by a call to this tag: it renders a plain-language summary
    sentence (always present for screen readers) plus a toggleable
    <table> with the same numbers the chart shows, sourced from the
    exact same labels/values passed to Chart.js - never a separately
    computed summary that could drift from what's actually plotted.
    """
    pairs = zip_lists(labels, values)
    return {
        "chart_id": chart_id,
        "title": title,
        "value_label": value_label,
        "pairs": pairs,
        "count": len(labels) if labels else 0,
    }
