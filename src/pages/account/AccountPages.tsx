import { useEffect, useRef, useState } from "react";
import type { Role } from "../../types";
import { Button, Icon, Modal } from "../../components/ui";
import {
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  type NotificationItem,
} from "../../lib/notifications";
import {
  getMySignature,
  getMySignatureImage,
  saveMySignature,
  removeMySignature,
  type SignatureMetadata,
} from "../../lib/signatures";

export function SignaturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const hasDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState<SignatureMetadata | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(4);

  const [pendingImage, setPendingImage] = useState<{
    mimeType: "image/png" | "image/jpeg";
    base64: string;
  } | null>(null);

  // Load the user's saved signature.
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function loadSignature() {
      try {
        const metadata = await getMySignature();

        if (!active) return;

        setSignature(metadata);
        setSaved(Boolean(metadata));

        if (metadata) {
          const blob = await getMySignatureImage();

          if (!active) return;

          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your signature.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSignature();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  // Clean up preview object URLs when the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    drawingRef.current = false;
    hasDrawingRef.current = false;
    lastPointRef.current = null;
    setPendingImage(null);
  }

  function getCanvasPoint(
    event: PointerEvent | React.PointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current!;

    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function configureBrush(context: CanvasRenderingContext2D) {
    context.strokeStyle = "#202020";
    context.fillStyle = "#202020";
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.imageSmoothingEnabled = true;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();

    canvas.setPointerCapture(event.pointerId);

    drawingRef.current = true;

    const point = getCanvasPoint(event);

    lastPointRef.current = point;

    configureBrush(context);

    // Draw a round starting point, even for a quick tap.
    context.beginPath();
    context.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    context.fill();

    hasDrawingRef.current = true;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();

    const nativeEvent = event.nativeEvent;

    // Use intermediate pointer positions when supported.
    const pointerEvents = nativeEvent.getCoalescedEvents
      ? nativeEvent.getCoalescedEvents()
      : [nativeEvent];

    configureBrush(context);

    for (const pointerEvent of pointerEvents) {
      const point = getCanvasPoint(pointerEvent);
      const previous = lastPointRef.current;

      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);

      // Add more points during fast movements to prevent gaps.
      const spacing = Math.max(1, brushSize * 0.2);
      const steps = Math.max(1, Math.ceil(distance / spacing));

      context.beginPath();
      context.moveTo(previous.x, previous.y);

      // Interpolate positions and use quadratic curves for smoother strokes.
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;

        const interpolatedPoint = {
          x: previous.x + (point.x - previous.x) * t,
          y: previous.y + (point.y - previous.y) * t,
        };

        const midpoint = {
          x: (previous.x + interpolatedPoint.x) / 2,
          y: (previous.y + interpolatedPoint.y) / 2,
        };

        context.quadraticCurveTo(
          previous.x,
          previous.y,
          midpoint.x,
          midpoint.y,
        );

        context.lineTo(interpolatedPoint.x, interpolatedPoint.y);
      }

      context.stroke();

      lastPointRef.current = point;
    }

    hasDrawingRef.current = true;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // Convert a selected image to Base64.
  async function handleUpload(file?: File) {
    if (!file) return;

    setError("");

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Please select a PNG or JPEG image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must not exceed 5 MB.");
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = reader.result;

          if (typeof result !== "string") {
            reject(new Error("Unable to read the selected image."));
            return;
          }

          resolve(result.split(",")[1] || "");
        };

        reader.onerror = () => {
          reject(new Error("Unable to read the image."));
        };

        reader.readAsDataURL(file);
      });

      const objectUrl = URL.createObjectURL(file);

      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return objectUrl;
      });

      setPendingImage({
        mimeType: file.type as "image/png" | "image/jpeg",
        base64,
      });

      setTab("upload");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to process the image.",
      );
    }
  }

  function resetEditor() {
    clearCanvas();
    setPendingImage(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (previewUrl && !saved) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  // Save either the drawn canvas or uploaded image.
  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      let imageData = pendingImage;

      if (tab === "draw") {
        const canvas = canvasRef.current;

        if (!canvas || !hasDrawingRef.current) {
          throw new Error("Please draw your signature first.");
        }

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/png");
        });

        if (!blob) {
          throw new Error("Unable to create the signature image.");
        }

        if (blob.size > 5 * 1024 * 1024) {
          throw new Error("The signature image must not exceed 5 MB.");
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            const result = reader.result;

            if (typeof result !== "string") {
              reject(new Error("Unable to process the signature."));
              return;
            }

            resolve(result.split(",")[1] || "");
          };

          reader.onerror = () => {
            reject(new Error("Unable to process the signature."));
          };

          reader.readAsDataURL(blob);
        });

        imageData = {
          mimeType: "image/png",
          base64,
        };
      }

      if (!imageData) {
        throw new Error("Please draw or upload a signature first.");
      }

      const metadata = await saveMySignature(
        imageData.mimeType,
        imageData.base64,
      );

      const blob = await getMySignatureImage();
      const objectUrl = URL.createObjectURL(blob);

      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return objectUrl;
      });

      setSignature(metadata);
      setSaved(true);
      setPendingImage(null);
      setConfirm(false);
      clearCanvas();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save your signature.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Remove the saved signature from the account.
  async function handleRemove() {
    if (
      !window.confirm("Are you sure you want to remove your saved signature?")
    ) {
      return;
    }

    setRemoving(true);
    setError("");

    try {
      await removeMySignature();

      setSaved(false);
      setSignature(null);
      setPendingImage(null);

      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove your signature.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="signature-layout">
      <section className="card signature-main">
        <div className="card-head">
          <div>
            <h3>Create your e-signature</h3>
            <p>Draw a signature or upload a transparent image file.</p>
          </div>
        </div>

        <div className="signature-tabs">
          <button
            className={tab === "draw" ? "active" : ""}
            onClick={() => {
              setTab("draw");
              setError("");
            }}
          >
            <Icon name="pen" size={17} /> Draw signature
          </button>

          <button
            className={tab === "upload" ? "active" : ""}
            onClick={() => {
              setTab("upload");
              setError("");
            }}
          >
            <Icon name="upload" size={17} /> Upload image
          </button>
        </div>

        {tab === "draw" ? (
          <div className="signature-pad">
            <div className="signature-brush-control">
              <label htmlFor="signature-brush">
                Brush thickness: {brushSize}px
              </label>

              <input
                id="signature-brush"
                type="range"
                min="1"
                max="14"
                step="1"
                value={brushSize}
                onChange={(event) => {
                  setBrushSize(Number(event.target.value));
                }}
              />
            </div>

            <canvas
              ref={canvasRef}
              width={1800}
              height={500}
              aria-label="Draw your signature"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                display: "block",
                width: "100%",
                height: "180px",
                touchAction: "none",
                cursor: "crosshair",
              }}
            />

            <div className="pad-line" />

            <small>
              Draw your signature above using your mouse, stylus, or touch
              screen.
            </small>

            <button type="button" onClick={clearCanvas}>
              Clear
            </button>
          </div>
        ) : (
          <label className="upload-zone">
            <Icon name="upload" size={30} />
            <strong>Drop your signature image here</strong>
            <span>or click to browse · PNG or JPG up to 5 MB</span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                void handleUpload(event.target.files?.[0]);
              }}
            />
          </label>
        )}

        {error && (
          <div className="notification-error" role="alert">
            {error}
          </div>
        )}

        <div className="signature-actions">
          <Button variant="secondary" onClick={resetEditor}>
            Reset
          </Button>

          <Button onClick={() => setConfirm(true)} disabled={saving || loading}>
            Save signature
          </Button>
        </div>
      </section>

      <aside className="card signature-preview">
        <span className="eyebrow">Current signature</span>

        <div className="preview-sign">
          {loading ? (
            <em>Loading signature...</em>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Saved signature"
              style={{
                maxWidth: "100%",
                maxHeight: "120px",
                objectFit: "contain",
              }}
            />
          ) : (
            <em>No signature saved</em>
          )}
        </div>

        <div className="signature-status">
          <i />

          <div>
            <strong>
              {loading
                ? "Loading..."
                : saved
                  ? "Signature ready"
                  : "No saved signature"}
            </strong>

            <span>
              {signature
                ? `Last updated ${new Date(
                    signature.updatedAt,
                  ).toLocaleString()}`
                : "Create one to approve documents"}
            </span>
          </div>
        </div>

        {saved && (
          <Button
            variant="danger"
            className="full"
            onClick={() => void handleRemove()}
            disabled={removing}
          >
            {removing ? "Removing..." : "Remove signature"}
          </Button>
        )}

        <div className="legal-note">
          <Icon name="check" size={18} />

          <p>
            Your signature image is encrypted before being stored on the
            backend. It is not a legally verified digital signature.
          </p>
        </div>
      </aside>

      {confirm && (
        <Modal
          title={saved ? "Replace saved signature?" : "Save this signature?"}
          close={() => setConfirm(false)}
        >
          <p>
            This signature will be saved to your account and can be used in
            document approval workflows.
          </p>

          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setConfirm(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving
                ? "Saving..."
                : saved
                  ? "Replace signature"
                  : "Save signature"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function NotificationsPage({
  role,
  onOpenRequest,
}: {
  role: Role;
  onOpenRequest: (referenceNumber: string) => Promise<void>;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadNotifications() {
    try {
      const notifications = await getNotificationsApi();
      setItems(notifications);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const filteredItems =
    filter === "unread" ? items.filter((item) => !item.isRead) : items;

  function getNotificationIcon(type: string) {
    switch (type) {
      case "submission_confirmation":
        return "check";
      case "new_request":
        return "file";
      case "approved":
        return "check";
      case "revision_requested":
        return "rotate";
      case "reminder":
        return "clock";
      default:
        return "file";
    }
  }

  function getNotificationTone(type: string) {
    switch (type) {
      case "submission_confirmation":
      case "approved":
        return "green";
      case "revision_requested":
        return "amber";
      default:
        return "maroon";
    }
  }

  function formatNotificationDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markNotificationAsReadApi(notificationId);

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );

      window.dispatchEvent(new Event("notifications-updated"));

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark notification as read.",
      );
    }
  }

  async function handleNotificationClick(item: NotificationItem) {
    try {
      if (!item.isRead) {
        await markNotificationAsReadApi(item.id);

        setItems((currentItems) =>
          currentItems.map((notification) =>
            notification.id === item.id
              ? { ...notification, isRead: true }
              : notification,
          ),
        );

        window.dispatchEvent(new Event("notifications-updated"));
      }

      setError("");

      if (item.referenceNumber) {
        await onOpenRequest(item.referenceNumber);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this notification.",
      );
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      await markAllNotificationsAsReadApi();

      setItems((currentItems) =>
        currentItems.map((item) => ({
          ...item,
          isRead: true,
        })),
      );

      window.dispatchEvent(new Event("notifications-updated"));

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark all notifications as read.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="card notification-card">
      <div className="card-head">
        <div>
          <h3>All notifications</h3>
          <p>
            {role === "student"
              ? "Updates about your documents and submissions."
              : "Updates about documents and approval activity."}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0 || actionLoading}
        >
          {actionLoading ? "Updating..." : "Mark all as read"}
        </Button>
      </div>

      <div className="notification-filter">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>

        <button
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          Unread <span>{unreadCount}</span>
        </button>
      </div>

      {error && (
        <div className="notification-error" role="alert">
          {error}
          <button onClick={() => void loadNotifications()}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="notification-empty">
          <p>Loading notifications...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="notification-empty">
          <Icon name="check" size={24} />
          <p>
            {filter === "unread"
              ? "You're all caught up. No unread notifications."
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        filteredItems.map((item) => {
          const icon = getNotificationIcon(item.type);
          const tone = getNotificationTone(item.type);

          return (
            <div
              className={`notification-item ${!item.isRead ? "unread" : ""}`}
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => void handleNotificationClick(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleNotificationClick(item);
                }
              }}
              title={
                item.referenceNumber
                  ? "Open request details"
                  : "Mark notification as read"
              }
            >
              <div className={`notification-icon tone-${tone}`}>
                <Icon name={icon} />
              </div>

              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>{formatNotificationDate(item.createdAt)}</small>
              </div>

              {!item.isRead && <i />}

              <button
                type="button"
                aria-label={
                  item.isRead
                    ? "Notification already read"
                    : "Mark notification as read"
                }
                title={item.isRead ? "Already read" : "Mark as read"}
                disabled={item.isRead}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleMarkAsRead(item.id);
                }}
              >
                <Icon name="chevron" size={16} />
              </button>
            </div>
          );
        })
      )}
    </section>
  );
}
