declare module "libheif-js" {
  export const HeifDecoder: {
    new (): {
      decode: (data: Uint8Array) => any[];
    };
  };
  const libheif: any;
  export default libheif;
}

declare module "piexifjs" {
  export function load(data: string): any;
  export function dump(exifObj: any): string;
  export function insert(exifStr: string, imageStr: string): string;
  export function remove(imageStr: string): string;
  export const TagValues: any;
  export const ImageIFD: any;
  export const ExifIFD: any;
  export const GPSIFD: any;
}
