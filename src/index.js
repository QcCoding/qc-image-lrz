import Exif from 'exif-js'
/**
 * 技术栈： [Exif-Js](http://code.ciaoca.com/javascript/exif-js/)
 *
 * QcImageLrz Canvas图片压缩工具
 *
 * 调用1：
 *  var img = new QcImageLrz(file,{...全局配置})
 *  img.compress().then(res=>{
 *    // res 成功返回数据
 *  }).catch(err=>{
 *    // err 错误返回数据
 *  })
 *
 * 调用2：
 *  var img = new QcImageLrz()
 *  img.compress(file,{...临时配置}).then(res=>{
 *    // res 成功返回数据
 *  }).catch(err=>{
 *    // err 错误返回数据
 *  })
 *
 * @param {String|Object} file 必须，但可在执行压缩时传入，若不存在则会抛出异常，需要压缩的图片对象或字符串
 * @param {Object} config 可选，图片压缩全局配置
 *  => @param {String} config.name 可选，图片名称，默认随机生成
 *  => @param {Number} config.width 可选，压缩后图片宽度，默认750px
 *  => @param {Number} config.height 可选，压缩后图片高度，默认为null，高度自适应
 *  => @param {Number} config.quality 可选，压缩后图片质量，默认0.45，值范围在0~1之间
 *  => @param {String} config.type 可选，压缩后图片格式，默认为'image/jpeg'，当值为null时使用图片原有格式（但不推荐，因为遇到png格式只会越压越大）
 *  => @param {String} config.resultMode 可选，压缩后返回图片模式，默认返回base64，可选值：base64与file文件域两种模式
 *  => @param {Boolean} config.dev 可选，是否开发模式，默认为 process.env.NODE_ENV === 'development'或fasle，开发模式将展示相关输出
 */
const QcImageLrz = function (file, config) {
  this.base64UrlReg = /^data:image\/(\w+);base64,/i
  this.type = null
  this.size = null
  this.fileIsBase64 = null
  this.fileIsString = null
  this.sourceNewImg = null
  this.canvas = null
  this.ctx = null
  this.resize = null
  this.orientation = null

  // 压缩图片配置
  this.tempConfig = null
  this.defaultConfig = {
    name: this.createImgName(),
    width: 750, // Number，压缩后图片宽度，默认750px
    height: null, // Number，压缩后图片高度，默认为null，高度自适应
    quality: 0.8, // Number，压缩后图片质量，默认0.45，值范围在0~1之间
    type: 'image/jpeg', // String，压缩后图片格式，默认为'image/jpeg'，当值为null时使用图片原有格式（但不推荐，因为遇到png格式只会越压越大）
    resultMode: 'base64', // String，压缩后返回图片模式，默认返回base64，可选值：base64与file文件域两种模式
    dev: process.env.NODE_ENV === 'development' // Boolean，是否开发模式，开发模式将展示相关输出
  }
  this.config = config ? Object.assign({}, this.defaultConfig, config) : this.defaultConfig
  if (this.config.dev) console.group('[QcImageLrz Tip]')

  // 监听this.file,以更新压缩数据
  var resThisImg = null
  Object.defineProperty(this, 'file', {
    get: function () {
      return resThisImg
    },
    set: function (val) {
      resThisImg = val
      if (val) {
        this.config.name = this.createImgName(val.type)
        this.fileIsString = typeof val === 'string'
        this.fileIsBase64 = this.base64UrlReg.test(val)
        if (this.fileIsString) {
          this.type = this.getFileStringType(val, this.fileIsBase64)
          if (this.fileIsBase64) this.size = this.getBase64Size(val)
        } else {
          this.type = val.type
          this.size = val.size
        }
        if (this.config.dev) {
          console.log('[QcImageLrz Tip]-文件发生更新，已更新相关数据')
        }
      } else {
        this.type = val
        this.size = val
        this.fileIsBase64 = val
        if (this.config.dev) {
          console.log('[QcImageLrz Tip]-文件清除，已清空相关数据')
        }
      }
    }
  })
  if (file) this.file = file
}

/**
 *  图片压缩
 * @param {String|Object} file 必须，但默认会从实例中获取，若不存在则会抛出异常，需要压缩的图片对象或字符串
 * @param {Object} tempConfig 可选，图片压缩临时配置，与主实例config一致，默认使用全局配置
 */
QcImageLrz.prototype.compress = function (file, tempConfig) {
  const _this = this
  if (file) this.file = file
  if (!document.createElement('canvas').getContext) {
    throw new Error('[QcImageLrz Error]-浏览器不支持canvas')
  }
  if (!this.file) {
    throw new Error('[QcImageLrz Error]-未发现可压缩的图片对象或base64Url，请检查是否定义了file')
  }
  if (tempConfig) {
    this.tempConfig = Object.assign({}, this.config, tempConfig)
    if (this.config.dev) console.log('[QcImageLrz Tip]-发现单独配置，已更新相关配置')
  }

  return new Promise((resolve, reject) => {
    if (_this.fileIsString) {
      _this
        .core(_this.file)
        .then(res => resolve(res))
        .catch(err => reject(err))
    } else {
      var reader = new FileReader()
      reader.onload = function () {
        _this
          .core(this.result)
          .then(res => resolve(res))
          .catch(err => reject(err))
      }
      reader.readAsDataURL(_this.file)
    }
  })
}

/**
 * 图片压缩核心
 * @param {String} 必须，imgUrl 图片地址
 * => @Callback {Function} .then 成功回调
 * => @Callback {Function} .catch 错误回调
 */
QcImageLrz.prototype.core = function (imgUrl) {
  if (!imgUrl) return

  const _this = this
  const config = this.tempConfig || this.config
  const type = config.type || this.type
  const source = new Image()
  const canvas = document.createElement('canvas')
  this.sourceNewImg = source
  this.canvas = canvas
  var result

  return new Promise((resolve, reject) => {
    source.onerror = function () {
      var err = new Error('[QcImageLrz Error]-加载图片文件失败')
      reject(err)
      throw err
    }

    source.onload = function () {
      try {
        // console.log('Exif:' + typeof (Exif))
        // 传入blob在android4.3以下有bug
        Exif.getData(typeof _this.file === 'object' ? _this.file : source, function () {
          _this.orientation = Exif.getTag(this, 'Orientation')
          _this.resize = _this.createResize()
          // 开始压缩
          canvas.width = _this.resize.width
          canvas.height = _this.resize.height
          _this.ctx = canvas.getContext('2d')
          if (type === 'image/jpeg') {
            // 避免透明图片黑色背景
            var imageData = _this.ctx.getImageData(0, 0, _this.resize.width, _this.resize.height)
            for (var i = 0; i < imageData.data.length; i += 4) {
              // 当该像素是透明的，则设置成白色
              if (imageData.data[i + 3] === 0) {
                imageData.data[i] = 255
                imageData.data[i + 1] = 255
                imageData.data[i + 2] = 255
                imageData.data[i + 3] = 255
              }
            }
            _this.ctx.putImageData(imageData, 0, 0)
          }
          var base64Url = _this.createBase64()
          if (base64Url.length < 10) {
            var err = new Error('[QcImageLrz Error]-生成base64Url失败')
            reject(err)
            throw err
          }
          result = _this.compressResultDeal(base64Url)
          // 清空临时配置
          if (_this.tempConfig) _this.tempConfig = null
          // 执行回调并返回压缩结果
          resolve(result)
        })
      } catch (err) {
        // 这样能解决低内存设备闪退的问题吗？
        console.log('压缩失败')
        _this.resize = _this.createResize()
        // 开始压缩
        canvas.width = _this.resize.width
        canvas.height = _this.resize.height
        result = _this.compressResultDeal(imgUrl)
        // 清空临时配置
        if (_this.tempConfig) _this.tempConfig = null
        // 执行回调并返回压缩结果
        resolve(result)
      }
    }
    source.src = imgUrl
  })
}

// 创建图片压缩后尺寸
QcImageLrz.prototype.createResize = function () {
  const config = this.tempConfig || this.config
  const source = this.sourceNewImg

  var ret = {
    width: source.width,
    height: source.height
  }

  if ('5678'.indexOf(this.orientation) > -1) {
    ret.width = source.height
    ret.height = source.width
  }

  // 如果原图尺寸小于设定，采用原图尺寸
  if (ret.width < config.width || ret.height < config.height) {
    if (this.config.dev) console.log('[QcImageLrz Tip]-原图尺寸小于设定，采用原图尺寸！')
    return ret
  }

  const scale = ret.width / ret.height

  if (config.width && config.height) {
    if (scale >= config.width / config.height) {
      if (ret.width > config.width) {
        ret.width = config.width
        ret.height = Math.ceil(config.width / scale)
      }
    } else {
      if (ret.height > config.height) {
        ret.height = config.height
        ret.width = Math.ceil(config.height * scale)
      }
    }
  } else if (config.width) {
    if (config.width < ret.width) {
      ret.width = config.width
      ret.height = Math.ceil(config.width / scale)
    }
  } else if (config.height) {
    if (config.height < ret.height) {
      ret.width = Math.ceil(config.height * scale)
      ret.height = config.height
    }
  }

  // 超过这个值base64无法生成，在IOS上，是真的吗？我读书少，你别骗我
  // while (ret.width >= 3264 || ret.height >= 2448) {
  //   ret.width *= 0.8
  //   ret.height *= 0.8
  // }

  if (this.config.dev) console.log('[QcImageLrz Tip]-压缩尺寸计算成功！')
  return ret
}

// 创建图片压缩后的base64Url
QcImageLrz.prototype.createBase64 = function () {
  const config = this.tempConfig || this.config
  const source = this.sourceNewImg
  const orientation = this.orientation
  const resize = this.resize
  const canvas = this.canvas
  const ctx = this.ctx
  const type = config.type || this.type

  // 调整为正确方向
  switch (orientation) {
    case 3:
      ctx.rotate((180 * Math.PI) / 180)
      ctx.drawImage(source, -resize.width, -resize.height, resize.width, resize.height)
      break
    case 6:
      ctx.rotate((90 * Math.PI) / 180)
      ctx.drawImage(source, 0, -resize.width, resize.height, resize.width)
      break
    case 8:
      ctx.rotate((270 * Math.PI) / 180)
      ctx.drawImage(source, -resize.height, 0, resize.height, resize.width)
      break

    case 2:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(source, 0, 0, resize.width, resize.height)
      break
    case 4:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.rotate((180 * Math.PI) / 180)
      ctx.drawImage(source, -resize.width, -resize.height, resize.width, resize.height)
      break
    case 5:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.rotate((90 * Math.PI) / 180)
      ctx.drawImage(source, 0, -resize.width, resize.height, resize.width)
      break
    case 7:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.rotate((270 * Math.PI) / 180)
      ctx.drawImage(source, -resize.height, 0, resize.height, resize.width)
      break

    default:
      ctx.drawImage(source, 0, 0, resize.width, resize.height)
  }

  return canvas.toDataURL(type, config.quality)
}

/**
 * 根据返回模式对图片压缩结果进行处理
 * @param {String} result 图片压缩后的base64Url
 */
QcImageLrz.prototype.compressResultDeal = function (result) {
  const config = this.tempConfig || this.config
  const source = this.sourceNewImg
  var dealResult
  var resultSize = this.getBase64Size(result) // 压缩后图片大小

  if (resultSize > this.size) {
    // 压缩后图片大小大于源图，采用源文件
    dealResult = this.file
    if (config.resultMode === 'base64' && !this.fileIsBase64) {
      // 返回base64模式
      dealResult = this.fileConverBase64(source, this.type)
    }
    if (config.resultMode === 'file' && this.fileIsBase64) {
      // 返回文件域模式
      dealResult = this.base64ConverFile(this.file)
    }
    if (this.config.dev) console.log('[QcImageLrz Tip]-图片压缩过大，返回原图！')
  } else {
    // 压缩后图片大小小于源图，采用压缩后结果，默认base64模式
    dealResult = result
    if (config.resultMode === 'file') {
      // 返回文件域模式
      dealResult = this.base64ConverFile(result)
    }
    if (this.config.dev) console.log('[QcImageLrz Tip]-图片压缩成功，返回压缩结果！')
  }

  if (this.config.dev) {
    var tip = {
      result: {
        width: this.resize.width,
        height: this.resize.height,
        size: (resultSize / 1024).toFixed(2) + 'kb',
        type: config.type,
        mode: config.resultMode
      },
      source: {
        width: source.width,
        height: source.height,
        size: (this.size / 1024).toFixed(2) + 'kb',
        type: this.type,
        mode: this.fileIsBase64 ? 'base64' : this.fileIsString ? 'other' : 'file'
      }
    }
    console.table(tip)
    console.groupEnd()
  }
  return dealResult
}

/**
 * file文件域转base64Url
 * @param {Object} loadImageResult 必须，new Image().onLoad后返回的对象
 *  @param {String} type 必须，图片类型
 */
QcImageLrz.prototype.fileConverBase64 = function (loadImageResult, type) {
  if (!loadImageResult || !type) return
  const canvas = document.createElement('canvas')
  canvas.width = loadImageResult.width
  canvas.height = loadImageResult.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(loadImageResult, 0, 0, loadImageResult.width, loadImageResult.height)
  const base64Url = canvas.toDataURL(type, 1)
  return base64Url
}

/**
 * base64Url转file文件域
 * @param {String} base64Url 必须，图片base64字符串
 * @param {String} name 可选，图片名称，默认随机生成
 */
QcImageLrz.prototype.base64ConverFile = function (base64Url, name) {
  if (!base64Url) return

  // 初始化参数
  const config = this.tempConfig || this.config
  name = name || config.name

  // 获取图片类型
  const type = this.getFileStringType(base64Url, true)

  // 获取图片字符串
  const imgString = base64Url.split(',')[1]

  // 进行转码
  const atobSring = atob(imgString)
  let len = atobSring.length
  const u8arr = new Uint8Array(len)
  while (len--) {
    u8arr[len] = atobSring.charCodeAt(len)
  }

  // 返回保存文件域
  const file = new File([u8arr], name, { type: type })
  return file
}

/**
 * 获取字符串图片文件类型
 * @param {String} file 可选，默认this.file，字符串图片文件
 * @param {Boolean} fileIsBase64 可选，默认this.fileIsBase64，是否为base64Url
 */
QcImageLrz.prototype.getFileStringType = function (file, fileIsBase64) {
  file = file || this.file
  fileIsBase64 = fileIsBase64 || this.fileIsBase64
  return fileIsBase64
    ? /image\/[A-z]+/.exec(file)[0]
    : 'image/' + /.[A-z]+$/.exec(file)[0].replace('.', '')
}

/**
 * 获取base64文件大小
 * @param {String} base64Url 必须，图片base64字符串
 */
QcImageLrz.prototype.getBase64Size = function (base64Url) {
  if (!base64Url) return

  // 去头部data格式
  var str = base64Url.replace(this.base64UrlReg, '')

  // 去等号
  const equalIndex = str.indexOf('=')
  if (equalIndex !== -1) str = str.substring(0, equalIndex)

  // 计算文件流大小并返回
  const strLength = str.length
  return parseInt(strLength - (strLength / 8) * 2)
}

// 随机生成图片名称
QcImageLrz.prototype.createImgName = function (type) {
  var ext = (type || 'jpg').replace('image/', '').replace('jpeg', 'jpg')
  return (
    'img_' +
    Number(
      Math.random()
        .toString()
        .substr(2)
    ).toString(36) + '.' + ext
  )
}
export function init(file, config) {
  return new QcImageLrz(file, config);
}
export const version = process.env.VERSION
export default QcImageLrz;
