package com.heerkirov.hedge.server.utils

import com.twelvemonkeys.imageio.plugins.webp.WebPImageReaderSpi
import javax.imageio.ImageIO
import javax.imageio.spi.IIORegistry

/**
 * 在模块化/jlink 运行时，ImageIO 可能无法通过 SPI 自动发现 TwelveMonkeys 插件。
 * 需要在首次使用前显式注册。
 */
internal object ImageIOPlugins {
    @Volatile private var registered = false

    fun register() {
        if(registered) return
        synchronized(this) {
            if(registered) return
            if(!ImageIO.getImageReadersBySuffix("webp").hasNext()) {
                IIORegistry.getDefaultInstance().registerServiceProvider(WebPImageReaderSpi())
            }
            registered = true
        }
    }
}
