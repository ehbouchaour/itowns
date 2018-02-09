import { Euler } from 'three';
import Coordinates from './Geographic/Coordinates';

function toCoord(ori, offset) {
    return new Coordinates('EPSG:2154', ori.easting + offset.x, ori.northing + offset.y, ori.altitude + offset.z);
}
function toCoordGeographic(ori) {
    return new Coordinates('EPSG:4326', ori.longitude, ori.latitude, ori.height);
}

// function toOri(ori) {
//     const d2r = Math.PI / 180;
//     return new Euler(
//         ori.pitch * d2r,
//         ori.roll * d2r,
//         ori.heading * d2r, 'ZXY');
// }

// export const oiStereopolis = {
//     toCoord,
//     toOri,
//     offset: {
//         x: 0,
//         y: 0,
//         z: 0,
//     },
// };

function toOriMicMac(ori) {
    const d2r = Math.PI / 180;
    return new Euler(
        ori.roll * d2r,
        ori.pitch * d2r,
        ori.heading * d2r,
        'XYZ');
}

function toOriMontBlanc(ori) {
    const d2r = Math.PI / 180;
    return new Euler(
        ori.tilt * d2r,
        ori.azimuth * d2r,
        ori.roll * d2r,
        'ZYX');
}

export const oiMicMac = {
    toCoord,
    toOri: toOriMicMac, // ori => toOriMicMac(ori),
    offset: {
        x: 0,
        y: 0,
        z: 0,
    },
};

export const oiMontBlanc = {
    toCoord: toCoordGeographic,
    toOri: toOriMontBlanc, // ori => toOriMicMac(ori),
    offset: {
        x: 0,
        y: 0,
        z: 0,
    },
};

export default {
    decode(arrayOE, convert) {
        if (!arrayOE || !(arrayOE instanceof Array)) {
            throw new Error('lol');
        }
        const result = new Array(arrayOE.length);

        for (let i = 0; i < arrayOE.length; ++i) {
            // console.log('Decoding line : ', arrayOE[i]);
            result[i] = {
                coord: convert.toCoord(arrayOE[i], convert.offset),
                orientation: convert.toOri(arrayOE[i]),
                source: arrayOE[i],
            };
        }
        return result;
    },
    
};
