import { Asset } from 'expo-asset';
import { Image, type ImageSourcePropType } from 'react-native';

const MAP_PIN_SOURCE = require('../../assets/markers/map-pin.png');
const MAP_PIN_WIDTH = Image.resolveAssetSource(MAP_PIN_SOURCE)?.width || 48;

const markerScaleFor = (targetWidth: number) => Math.min(1, Math.max(0.01, targetWidth / MAP_PIN_WIDTH));

export const EVENT_MAP_MARKER_SCALE = markerScaleFor(48);
export const PICK_MAP_MARKER_SCALE = markerScaleFor(56);

export const loadMapMarkerSource = async (): Promise<ImageSourcePropType> => {
  const asset = Asset.fromModule(MAP_PIN_SOURCE);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const uri = asset.localUri || asset.uri;
  return uri ? { uri } : MAP_PIN_SOURCE;
};
