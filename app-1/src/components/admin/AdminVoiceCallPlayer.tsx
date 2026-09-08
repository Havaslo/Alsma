import { useEffect, useRef, useState } from "react";

import { LoaderCircle, Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

type PlayerState = "idle" | "loading" | "ready" | "playing" | "error";

export const AdminVoiceCallPlayer = ({
  callId,
}: {
  readonly callId: string;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const loadRecording = async () => {
    setState("loading");
    setError(null);
    try {
      const response = await apiClient.get<Blob>(
        `/admin/voice-calls/${callId}/recording`,
        {
          headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` },
          responseType: "blob",
        },
      );
      let sourceUrl: string;
      if (response.data.type.includes("json")) {
        const payload = JSON.parse(await response.data.text()) as {
          downloadUrl?: string;
        };
        if (!payload.downloadUrl) throw new Error("Recording URL is missing");
        sourceUrl = payload.downloadUrl;
      } else {
        sourceUrl = URL.createObjectURL(response.data);
        objectUrlRef.current = sourceUrl;
      }

      const audio = new Audio(sourceUrl);
      audioRef.current = audio;
      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
        setState("ready");
      });
      audio.addEventListener("timeupdate", () =>
        setCurrentTime(audio.currentTime),
      );
      audio.addEventListener("ended", () => {
        setCurrentTime(audio.duration);
        setState("ready");
      });
      audio.addEventListener("error", () => {
        setState("error");
        setError("Запись не удалось загрузить. Попробуйте повторить позже.");
      });
      audio.load();
      await audio.play();
      setState("playing");
    } catch {
      setState("error");
      setError(
        "Запись пока недоступна. Проверьте, что она сохранилась в Mango, и повторите позже.",
      );
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) {
      await loadRecording();
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
        setState("playing");
      } catch {
        setState("error");
        setError("Не удалось начать воспроизведение. Попробуйте ещё раз.");
      }
    } else {
      audio.pause();
      setState("ready");
    }
  };

  const seek = (value: string) => {
    const nextTime = Number(value);
    if (audioRef.current && Number.isFinite(nextTime)) {
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const isLoading = state === "loading";
  const isPlaying = state === "playing";
  const hasLoaded = state === "ready" || state === "playing";

  return (
    <div className="mt-5 rounded-2xl border border-line bg-page/60 p-4">
      <div className="flex items-center gap-3">
        <Button
          aria-label={
            isPlaying ? "Поставить запись на паузу" : "Воспроизвести запись"
          }
          className="size-11 shrink-0 rounded-full p-0"
          disabled={isLoading}
          onClick={() => void togglePlayback()}
          variant="secondary"
        >
          {isLoading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-4" />
          ) : state === "error" ? (
            <RotateCcw className="size-4" />
          ) : (
            <Play className="ml-0.5 size-4" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <input
            aria-label="Позиция записи"
            className="w-full accent-brand disabled:cursor-not-allowed"
            disabled={!hasLoaded}
            max={duration || 0}
            min="0"
            onChange={(event) => seek(event.target.value)}
            step="0.1"
            type="range"
            value={Math.min(currentTime, duration || 0)}
          />
          <div className="mt-1 flex justify-between text-xs text-muted-ui-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{duration ? formatTime(duration) : "—"}</span>
          </div>
        </div>
      </div>
      {isLoading && (
        <p className="mt-3 text-xs text-muted-ui-foreground">
          Загружаем запись…
        </p>
      )}
      {error && (
        <p className="mt-3 text-xs leading-5 text-destructive">{error}</p>
      )}
    </div>
  );
};
