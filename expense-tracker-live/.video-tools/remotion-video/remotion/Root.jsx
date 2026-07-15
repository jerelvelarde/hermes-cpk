import React from 'react';
import {Composition} from 'remotion';
import {DraftVideo} from './DraftVideo';

export const Root = () => {
  return (
    <Composition
      id="DraftVideo"
      component={DraftVideo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={180}
      defaultProps={{
        topic: 'Verifying Create Video and Diagram Buttons',
      }}
    />
  );
};
