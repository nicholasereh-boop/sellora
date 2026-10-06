import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { verifyEmail } from "../../api/auth";

// Target of the link in the verification email: /verify-email/:uid/:token
export default function VerifyEmailPage() {
  const { uid, token } = useParams();
  const [state, setState] = useState({ status: "loading", message: "" });
  const started = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in dev; the token is single-use, so
    // only fire the request once.
    if (started.current) return;
    started.current = true;
    verifyEmail({ uid, token })
      .then((data) => setState({ status: "ok", message: data.message }))
      .catch((error) =>
        setState({
          status: "error",
          message: error.response?.data?.error?.message ?? "Verification link is invalid or has expired.",
        })
      );
  }, [uid, token]);

  return (
    <div className="max-w-sm mx-auto py-8 text-center">
      {state.status === "loading" && <p className="text-ink-soft">Verifying your email...</p>}

      {state.status === "ok" && (
        <>
          <h1 className="font-display text-3xl mb-2">Email verified</h1>
          <p className="text-ink-soft mb-8">{state.message}</p>
          <Link to="/login" className="inline-block bg-ink text-paper px-6 py-3 rounded-full hover:bg-indigo transition-colors">
            Log in
          </Link>
        </>
      )}

      {state.status === "error" && (
        <>
          <h1 className="font-display text-3xl mb-2">Link not valid</h1>
          <p className="text-ink-soft mb-8">{state.message}</p>
          <Link to="/login" className="text-ink underline">
            Back to log in
          </Link>
        </>
      )}
    </div>
  );
}
