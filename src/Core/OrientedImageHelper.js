import { Euler, Matrix4 } from 'three';
import Coordinates from './Geographic/Coordinates';

function toCoord(ori, offset) {
    return new Coordinates('EPSG:2154', ori.easting + offset.x, ori.northing + offset.y, ori.altitude + offset.z);
}

function toCoordGeographic(ori) {
    return new Coordinates('EPSG:4326', ori.longitude, ori.latitude, ori.height);
}

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

    toCoordGeographic(ori) {
        return new Coordinates('EPSG:4326', ori.longitude, ori.latitude, ori.height);
    },

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

    parseInfoEastingNorthAltitudeToCoordinate(projection, info, offset) {
        return new Coordinates(projection, info.easting + offset.x, info.northing + offset.y, info.altitude + offset.z);
    },

    parseMicMacOrientationToMatrix(panoramic) {
        const d2r = Math.PI / 180;
        const euler = new Euler(
            panoramic.roll * d2r,
            panoramic.pitch * d2r,
            panoramic.heading * d2r,
            'XYZ');

        const matrixFromEuler = new Matrix4().makeRotationFromEuler(euler);

        // The three angles ω,ɸ,k are computed
        // for a traditionnal image coordinate system (X=colomns left to right and Y=lines bottom up)
        // and not for a computer vision compliant geometry (X=colomns left to right and Y=lines top down)
        // so we have to multiply to rotation matrix by this matrix :
        var inverseYZ = new Matrix4().set(
                1, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, -1, 0,
                0, 0, 0, 1);

        matrixFromEuler.multiply(inverseYZ);

        return matrixFromEuler;
    },

    parseSuisseOrientationToMatrix(panoramic) {
        const d2r = Math.PI / 180;
        const euler = new Euler(
            panoramic.tilt * d2r,
            panoramic.azimuth * d2r,
            panoramic.roll * d2r,
            'ZYX');

        const matrixFromEuler = new Matrix4().makeRotationFromEuler(euler);

        // // The three angles ω,ɸ,k are computed
        // // for a traditionnal image coordinate system (X=colomns left to right and Y=lines bottom up)
        // // and not for a computer vision compliant geometry (X=colomns left to right and Y=lines top down)
        // // so we have to multiply to rotation matrix by this matrix :
        // var inverseYZ = new Matrix4().set(
        //         1, 0, 0, 0,
        //         0, -1, 0, 0,
        //         0, 0, -1, 0,
        //         0, 0, 0, 1);

        // matrixFromEuler.multiply(inverseYZ);

        return matrixFromEuler;
    },
};
