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
    rotateEnabled?: boolean;
    zoomEnabled?: boolean;
    scrollEnabled?: boolean;
    nightMode?: boolean;
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
    rotateEnabled?: boolean;
    zoomEnabled?: boolean;
    scrollEnabled?: boolean;
    nightMode?: boolean;
    children?: React.ReactNode;
  }

  export interface MarkerProps {
    point: { lat: number; lon: number };
  }

  export class Marker extends React.Component<MarkerProps> {}
  export default class YaMap extends React.Component<YaMapProps> {}
}
