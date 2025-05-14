import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
  OffthreadVideo,
} from "remotion";
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/BarlowCondensed";
import { createCaptionPages, shortVideoSchema } from "../utils";
import React from 'react';
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

const { fontFamily } = loadFont(); // "Barlow Condensed"

export const PortraitVideo: React.FC<z.infer<typeof shortVideoSchema>> = ({
  scenes,
  music,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const captionBackgroundColor = config.captionBackgroundColor ?? "blue";

  const activeStyle = {
    backgroundColor: captionBackgroundColor,
    padding: "10px",
    marginLeft: "-10px",
    marginRight: "-10px",
    borderRadius: "10px",
  };

  const captionPosition = config.captionPosition ?? "center";
  let captionStyle: React.CSSProperties = {};
  if (captionPosition === "top") {
    captionStyle = { top: 100 };
  } else if (captionPosition === "bottom") {
    captionStyle = { bottom: 100 };
  } else {
    captionStyle = { top: "50%", transform: "translateY(-50%)" };
  }

  const PageWrapper: React.FC<{
    children: React.ReactNode;
    isActive: boolean;
  }> = ({ children, isActive }) => {
    return (
      <div
        style={{
          position: "absolute",
          width: "100%",
          textAlign: "center",
          fontFamily,
          fontSize: "1.5em",
          color: "white",
          fontWeight: "bold",
          textShadow: "0px 0px 8px black",
          WebkitTextStroke: "0.5px black",
          textTransform: "uppercase",
          ...(isActive ? activeStyle : {}),
          ...captionStyle,
        }}
      >
        {children}
      </div>
    );
  };

  const transitionDurationFrames = Math.floor(fps * 0.5);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {music && music.file && (
        <Audio
          src={music.file.startsWith('http') ? music.file : staticFile(music.file)}
          startFrom={music.start * fps}
          endAt={music.end ? music.end * fps : undefined}
          loop
          volume={0.1}
        />
      )}
      <TransitionSeries>
        {scenes.flatMap((scene, i) => {
          const { captions, audio, video } = scene;
          const pages = createCaptionPages({
            captions,
            lineMaxLength: 20,
            lineCount: 2,
            maxDistanceMs: 1000,
          });

          let sceneDurationInFrames = audio.duration * fps;
          if (config.paddingBack && i === scenes.length - 1) {
            sceneDurationInFrames += (config.paddingBack / 1000) * fps;
          }

          const sequenceElement = (
            <TransitionSeries.Sequence
              key={`scene-${i}`}
              durationInFrames={Math.round(sceneDurationInFrames)}
            >
              <AbsoluteFill>
                {video && (
                  <OffthreadVideo
                    src={video.startsWith('http') ? video : staticFile(video)}
                    muted
                    style={{ objectFit: 'cover', height: '100%', width: '100%' }}
                  />
                )}
                {audio.url && (
                  <Audio
                    src={audio.url.startsWith('http') ? audio.url : staticFile(audio.url)}
                  />
                )}
                {pages.map((page, j) => {
                  const pageDurationMs = page.endMs - page.startMs;
                  return (
                    <Sequence
                      key={`caption-${i}-${j}`}
                      from={Math.round(page.startMs * (fps / 1000))}
                      durationInFrames={Math.round(pageDurationMs * (fps / 1000))}
                    >
                      <PageWrapper isActive={true}>
                        {page.lines.map((lineObject, k) => (
                          <div key={k} style={{ marginBottom: '0.2em' }}>
                            {lineObject.texts.map(textSegment => textSegment.text).join(' ')}
                          </div>
                        ))}
                      </PageWrapper>
                    </Sequence>
                  );
                })}
              </AbsoluteFill>
            </TransitionSeries.Sequence>
          );

          if (i < scenes.length - 1) {
            const presentation = fade(); // solo fade por ahora
            const transitionElement = (
              <TransitionSeries.Transition
                key={`transition-${i}`}
                timing={linearTiming({ durationInFrames: transitionDurationFrames })}
                presentation={presentation}
              />
            );
            return [sequenceElement, transitionElement];
          }

          return [sequenceElement];
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
