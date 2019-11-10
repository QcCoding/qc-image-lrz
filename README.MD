# qc-image-lrz

一个 js 图片压缩库,用以压缩 jpg/png 格式图片

作者：[YanEr](https://github.com/qc-web-y)

## npm 包

![](https://img.shields.io/npm/v/qc-image-lrz.svg)

安装：`npm install --save qc-image-lrz`

## vue 项目使用示例

```js
import QcImageLrz from 'qc-image-lrz'
const ilt = new QcImageLrz()
//file可以时文件域，也可以是base64
//resultMode值可为：file/base64，then返回对应类型数据
return ilt.compress(file, { resultMode: 'file' }).then(compressRes => {
  return compressRes
})
```

## 参考

- [lrz](https://github.com/think2011/localResizeIMG)

- [exif-js](https://github.com/exif-js/exif-js)
