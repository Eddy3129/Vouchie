import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Extract parameters
  const type = searchParams.get("type") || "new"; // "new" or "proof"
  const title = searchParams.get("title") || "My Goal";
  const stake = searchParams.get("stake") || "10";
  const deadline = searchParams.get("deadline") || "";
  const username = searchParams.get("username") || "";
  const mode = searchParams.get("mode") || "Solo";

  // Format deadline
  let deadlineText = "";
  if (deadline) {
    const deadlineDate = new Date(parseInt(deadline));
    const now = new Date();
    const isToday = deadlineDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = deadlineDate.toDateString() === tomorrow.toDateString();

    const timeStr = deadlineDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      deadlineText = `Today at ${timeStr}`;
    } else if (isTomorrow) {
      deadlineText = `Tomorrow at ${timeStr}`;
    } else {
      deadlineText = deadlineDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  const isProof = type === "proof";
  const isSquad = mode === "Squad";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: isProof
            ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
            : "linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 50%, #E8DFD5 100%)",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
              }}
            >
              {isProof ? "✅" : "🎯"}
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: isProof ? "#FFA726" : "#8B5A2B",
                letterSpacing: "2px",
              }}
            >
              VOUCHIE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: isProof ? "rgba(255,167,38,0.2)" : "rgba(139,90,43,0.1)",
              padding: "12px 24px",
              borderRadius: "50px",
            }}
          >
            <span style={{ fontSize: "20px" }}>{isSquad ? "👥" : "🧍"}</span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: isProof ? "#FFA726" : "#8B5A2B",
              }}
            >
              {mode} Mode
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: "flex",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: isProof
                ? "linear-gradient(90deg, #22C55E, #16A34A)"
                : "linear-gradient(90deg, #FFA726, #FF9800)",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              padding: "10px 24px",
              borderRadius: "50px",
              letterSpacing: "1px",
            }}
          >
            {isProof ? "🔥 PROOF SUBMITTED" : "🚀 NEW CHALLENGE"}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "bold",
            color: isProof ? "#FFFFFF" : "#1F1F1F",
            marginBottom: "32px",
            lineHeight: "1.2",
            maxWidth: "900px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          &ldquo;{title.length > 40 ? title.substring(0, 40) + "..." : title}&rdquo;
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginBottom: "40px",
          }}
        >
          {/* Stake */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                color: isProof ? "#9CA3AF" : "#6B7280",
                fontWeight: "600",
                letterSpacing: "1px",
              }}
            >
              STAKE LOCKED
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "36px" }}>💰</span>
              <span
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: isProof ? "#22C55E" : "#16A34A",
                }}
              >
                ${stake}
              </span>
              <span
                style={{
                  fontSize: "24px",
                  color: isProof ? "#9CA3AF" : "#6B7280",
                }}
              >
                USDC
              </span>
            </div>
          </div>

          {/* Deadline */}
          {deadlineText && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  color: isProof ? "#9CA3AF" : "#6B7280",
                  fontWeight: "600",
                  letterSpacing: "1px",
                }}
              >
                {isProof ? "WAS DUE" : "DEADLINE"}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "36px" }}>⏰</span>
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: isProof ? "#FFFFFF" : "#1F1F1F",
                  }}
                >
                  {deadlineText}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          {/* Username */}
          {username && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: isProof
                    ? "linear-gradient(135deg, #FFA726, #FF9800)"
                    : "linear-gradient(135deg, #8B5A2B, #A67B5B)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
              <span
                style={{
                  fontSize: "24px",
                  color: isProof ? "#E5E7EB" : "#374151",
                  fontWeight: "600",
                }}
              >
                @{username}
              </span>
            </div>
          )}

          {/* CTA Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: isProof
                ? "linear-gradient(90deg, #8B5AFF, #6366F1)"
                : "linear-gradient(90deg, #8B5A2B, #A67B5B)",
              color: "white",
              fontSize: "24px",
              fontWeight: "bold",
              padding: "20px 40px",
              borderRadius: "16px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            {isProof ? (
              <>
                <span>👉</span>
                <span>VERIFY NOW</span>
              </>
            ) : (
              <>
                <span>💪</span>
                <span>HOLD ME ACCOUNTABLE</span>
              </>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
