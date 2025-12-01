import { enableAutoUnmount } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach } from 'vitest';
enableAutoUnmount(afterEach);
beforeEach(() => {
    setActivePinia(undefined);
});
if (typeof ImageData === 'undefined') {
    global.ImageData = class ImageData {
        data;
        width;
        height;
        constructor(dataOrWidth, widthOrHeight, height) {
            if (dataOrWidth instanceof Uint8ClampedArray) {
                this.data = dataOrWidth;
                this.width = widthOrHeight;
                this.height = height ?? dataOrWidth.length / 4 / widthOrHeight;
            }
            else {
                this.width = dataOrWidth;
                this.height = widthOrHeight;
                this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
            }
        }
    };
}
