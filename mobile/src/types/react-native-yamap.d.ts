declare module 'react-native-yamap' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type Region = {
    lat: number;
    lon: number;
    zoom: number;
    azimuth?: number;
    tilt?: number;
  };

  export interface YaMapProps extends ViewProps {
    initialRegion?: Region;
    showZoomControls?: boolean;
    interactiveDisabled?: boolean;
    rotateGesturesDisabled?: boolean;
    zoomGesturesDisabled?: boolean;
    scrollGesturesDisabled?: boolean;
    tiltGesturesDisabled?: boolean;
    fastTapDisabled?: boolean;
    nightMode?: boolean;
    onMapPress?: (e: any) => void;
    onMapLongPress?: (e: any) => void;
    children?: React.ReactNode;
  }

  export interface MarkerProps {
    point: { lat: number; lon: number };
  }

  export class Marker extends React.Component<MarkerProps> {}
  export default class YaMap extends React.Component<YaMapProps> {}
}

declare module 'react-native-yamap-plus' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type Region = {
    lat: number;
    lon: number;
    zoom: number;
    azimuth?: number;
    tilt?: number;
  };

  export interface YaMapProps extends ViewProps {
    initialRegion?: Region;
    showZoomControls?: boolean;
    interactiveDisabled?: boolean;
    rotateGesturesDisabled?: boolean;
    zoomGesturesDisabled?: boolean;
    scrollGesturesDisabled?: boolean;
    tiltGesturesDisabled?: boolean;
    fastTapDisabled?: boolean;
    nightMode?: boolean;
    onMapPress?: (e: any) => void;
    onMapLongPress?: (e: any) => void;
    children?: React.ReactNode;
  }

  export interface MarkerProps {
    point: { lat: number; lon: number };
  }

  export class Marker extends React.Component<MarkerProps> {}
  export default class YaMap extends React.Component<YaMapProps> {}
}
