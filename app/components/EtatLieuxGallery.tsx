'use client';

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';

interface EtatLieuxGalleryProps {
  photos: string[];
  title?: string;
  emptyMessage?: string;
}

export default function EtatLieuxGallery({
  photos,
  title = 'Photos de l\'etat des lieux',
  emptyMessage = 'Aucune photo disponible.',
}: EtatLieuxGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  const openAt = (index: number) => setActiveIndex(index);
  const close = () => {
    setActiveIndex(null);
    setTouchStartX(null);
    setIsFullscreen(false);
  };

  const goPrev = useCallback(() => {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex - 1 + photos.length) % photos.length);
  }, [activeIndex, photos.length]);

  const goNext = useCallback(() => {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % photos.length);
  }, [activeIndex, photos.length]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || photos.length <= 1) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = touchEndX - touchStartX;
    const threshold = 40;

    if (delta > threshold) {
      goPrev();
    } else if (delta < -threshold) {
      goNext();
    }

    setTouchStartX(null);
  };

  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      const container = imageContainerRef.current;
      if (!container) return;

      if (container.requestFullscreen) {
        await container.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen API failures (unsupported browser or blocked action).
    }
  };

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, goPrev, goNext]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  if (!photos.length) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <>
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mb-4 text-sm text-slate-600">
          {photos.length} photo{photos.length > 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => openAt(index)}
              className="group relative overflow-hidden rounded-lg border border-slate-200 shadow-sm transition hover:shadow-md"
              title={`Voir la photo ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo etat des lieux ${index + 1}`}
                className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 opacity-0 transition group-hover:opacity-100">
                  Ouvrir
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <a
            href={photos[activeIndex]}
            download={`etat-des-lieux-${activeIndex + 1}.jpg`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25"
          >
            Telecharger
          </a>

          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute right-24 top-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25"
          >
            {isFullscreen ? 'Quitter plein ecran' : 'Plein ecran'}
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
              title="Photo precedente"
            >
              ←
            </button>
          )}

          <div ref={imageContainerRef} className="max-h-[88vh] max-w-6xl overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[activeIndex]}
              alt={`Photo etat des lieux ${activeIndex + 1}`}
              className="max-h-[88vh] w-auto max-w-full object-contain"
            />
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
              title="Photo suivante"
            >
              →
            </button>
          )}

          {photos.length > 1 && (
            <div className="absolute bottom-14 left-1/2 w-[92%] max-w-4xl -translate-x-1/2 overflow-x-auto rounded-xl bg-black/35 px-3 py-2">
              <div className="flex min-w-max items-center gap-2">
                {photos.map((url, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={`thumb-${url}-${index}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`overflow-hidden rounded-md border-2 transition ${
                        isActive ? 'border-cyan-300 opacity-100' : 'border-white/25 opacity-70 hover:opacity-100'
                      }`}
                      title={`Aller a la photo ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Miniature etat des lieux ${index + 1}`}
                        className="h-14 w-20 object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white">
            {activeIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
