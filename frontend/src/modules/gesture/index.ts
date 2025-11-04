import { onBeforeUnmount, onMounted } from "vue"
import { BrowserViewContext } from "@/modules/browser"
import { executeGesture } from "./configure"

type Direction = 'L' | 'R' | 'U' | 'D'  // Left, Right, Up, Down

/**
 * 判断目标元素是否应该禁用手势
 */
function shouldIgnoreGesture(target: Element): boolean {
    // 在这些元素上禁用手势
    const ignoreSelectors = [
        'input', 'textarea', 'select',
        '[contenteditable="true"]',
        '.no-gestures'
    ]

    return ignoreSelectors.some(selector =>
        target.matches?.(selector) || target.closest?.(selector)
    )
}

/**
 * 计算手势路径的总距离
 */
function calculatePathDistance(path: { x: number; y: number }[]): number {
    let totalDistance = 0
    for(let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x
        const dy = path[i].y - path[i - 1].y
        totalDistance += Math.sqrt(dx * dx + dy * dy)
    }
    return totalDistance
}

/**
 * 计算平均速度（像素/毫秒）
 */
function calculateAverageSpeed(path: { x: number; y: number, t: number }[]): number {
    if(path.length < 2) return 0
    
    const distance = calculatePathDistance(path)
    const duration = path[path.length - 1].t - path[0].t
    
    return duration > 0 ? distance / duration : 0
}

/**
 * 判断是否为手势
 */
function isGesture(path: { x: number; y: number, t: number }[]): boolean {
    if(path.length < 2) return false
    
    const distance = calculatePathDistance(path)
    const duration = path[path.length - 1].t - path[0].t
    const speed = calculateAverageSpeed(path)
    
    // 距离太小，肯定是手滑或静止右键
    if(distance < 10) return false
    
    // 距离足够大，肯定是手势（不管速度快慢）
    if(distance > 30) return true
    
    // 小距离（10-30px）时，根据速度判断
    // 这个区间可能是：快速短手势 或 慢速手滑
    // 速度阈值：0.5 像素/毫秒 = 500 像素/秒
    if(distance >= 10 && distance <= 30) {
        return speed > 0.5
    }
    
    return false
}

/**
 * 计算两点之间的方向
 */
function getDirection(from: { x: number; y: number }, to: { x: number; y: number }): Direction | null {
    const dx = to.x - from.x
    const dy = to.y - from.y
    
    // 如果移动距离太小，忽略
    if(Math.abs(dx) < 3 && Math.abs(dy) < 3) return null
    
    // 根据水平和垂直分量的绝对值，判断主要方向
    if(Math.abs(dx) > Math.abs(dy)) {
        // 水平方向占主导
        return dx > 0 ? 'R' : 'L'
    } else {
        // 垂直方向占主导
        return dy > 0 ? 'D' : 'U'
    }
}

/**
 * 将路径转换为方向序列（带有对应的 path 索引）
 */
function pathToDirections(path: { x: number; y: number }[]): { dir: Direction; pathIdx: number }[] {
    if(path.length < 2) return []
    
    const directions: { dir: Direction; pathIdx: number }[] = []
    
    // 遍历路径中的每个点，计算方向
    for(let i = 1; i < path.length; i++) {
        const dir = getDirection(path[i - 1], path[i])
        if(dir) {
            // 记录方向和对应的 path 索引
            directions.push({ dir, pathIdx: i })
        }
    }
    
    return directions
}

/**
 * 合并连续的相同方向，并计算每个方向段的长度
 */
function mergeDirections(directions: { dir: Direction; pathIdx: number }[], path: { x: number; y: number }[]): { dir: Direction; distance: number }[] {
    if(directions.length === 0) return []
    
    const segments: { dir: Direction; distance: number; startPathIdx: number; endPathIdx: number }[] = []
    let currentDir = directions[0].dir
    let startIdx = 0
    
    for(let i = 1; i <= directions.length; i++) {
        // 当方向改变或到达末尾时，保存当前段
        if(i === directions.length || directions[i].dir !== currentDir) {
            segments.push({
                dir: currentDir,
                distance: 0,
                startPathIdx: directions[startIdx].pathIdx - 1,  // 该段在 path 中的起始索引
                endPathIdx: directions[i - 1].pathIdx  // 该段在 path 中的结束索引
            })
            
            if(i < directions.length) {
                currentDir = directions[i].dir
                startIdx = i
            }
        }
    }
    
    // 计算每个段的实际移动距离（使用正确的 path 索引）
    for(const segment of segments) {
        let distance = 0
        for(let i = segment.startPathIdx; i < segment.endPathIdx; i++) {
            const dx = path[i + 1].x - path[i].x
            const dy = path[i + 1].y - path[i].y
            distance += Math.sqrt(dx * dx + dy * dy)
        }
        segment.distance = distance
    }
    
    return segments.map(s => ({ dir: s.dir, distance: s.distance }))
}

/**
 * 过滤掉太短的方向段（可能是抖动或噪音）
 */
function filterShortSegments(segments: { dir: Direction; distance: number }[], minDistance: number = 15): Direction[] {
    return segments
        .filter(seg => seg.distance >= minDistance)
        .map(seg => seg.dir)
}

export interface GestureOptions {
    browserView: BrowserViewContext
}

export function installGesture(options: GestureOptions) {
    let isGestureActive: boolean = false
    let gesturePath: { x: number; y: number, t: number }[] = []
    let originalTarget: EventTarget | null = null
    let lastMouseEvent: { 
        clientX: number
        clientY: number
        ctrlKey: boolean
        shiftKey: boolean
        altKey: boolean
        metaKey: boolean
    } | null = null
    
    // 用于标记我们自己触发的 contextmenu 事件
    const allowedContextMenuEvents = new WeakSet<MouseEvent>()

    function handleMouseDown(e: MouseEvent) {
        if(e.button !== 2) {
            // 如果有残余的手势状态，先清除它
            if(isGestureActive) {
                isGestureActive = false
                gesturePath = []
                originalTarget = null
                lastMouseEvent = null
            }
            return
        }

        // 检查是否在需要排除的元素上
        if(e.target instanceof Element && shouldIgnoreGesture(e.target)) {
            return
        }

        isGestureActive = true
        gesturePath = [{x: e.clientX, y: e.clientY, t: Date.now()}]
        originalTarget = e.target  // 保存原始触发目标
        lastMouseEvent = { 
            clientX: e.clientX, 
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        }

        // 开始绘制轨迹视觉反馈
        showGestureFeedback(e.clientX, e.clientY)
    }

    function handleMouseMove(e: MouseEvent) {
        if(!isGestureActive) return

        gesturePath.push({x: e.clientX, y: e.clientY, t: Date.now()})

        updateGestureFeedback(e.clientX, e.clientY)
    }

    function handleMouseUp(e: MouseEvent) {
        if(e.button !== 2 || !isGestureActive) return

        isGestureActive = false

        // 使用新的判定逻辑：基于距离和速度
        if(isGesture(gesturePath)) {
            recognizeGesture(gesturePath)
        } else {
            showContextMenu()
        }
    }

    function showGestureFeedback(x: number, y: number) {

    }

    function updateGestureFeedback(x: number, y: number) {

    }

    function recognizeGesture(gesturePath: { x: number; y: number, t: number }[]) {
        // 1. 提取方向序列
        const directions = pathToDirections(gesturePath)
        
        // 2. 合并连续的相同方向
        const segments = mergeDirections(directions, gesturePath)
        
        // 3. 过滤掉太短的段
        const filtered = filterShortSegments(segments, 15)
        
        // 4. 转换为手势字符串
        const gestureString = filtered.join('')
        
        console.log('Recognized gesture:', gestureString)
        
        executeGesture(gestureString, options.browserView)
    }

    function showContextMenu() {
        // 在原始目标上重新触发 contextmenu 事件
        if(originalTarget && lastMouseEvent) {
            const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 2,
                buttons: 2,
                clientX: lastMouseEvent.clientX,
                clientY: lastMouseEvent.clientY,
                ctrlKey: lastMouseEvent.ctrlKey,
                shiftKey: lastMouseEvent.shiftKey,
                altKey: lastMouseEvent.altKey,
                metaKey: lastMouseEvent.metaKey
            })
            
            // 将此事件标记为允许通过的事件
            allowedContextMenuEvents.add(contextMenuEvent)
            
            // 触发事件
            originalTarget.dispatchEvent(contextMenuEvent)
        }
        
        // 清理
        originalTarget = null
        lastMouseEvent = null
    }

    function handleContextMenu(e: MouseEvent) {
        // 如果是我们自己触发的事件，放行
        if(allowedContextMenuEvents.has(e)) {
            return
        }
        
        // 否则阻止默认的 contextmenu
        e.preventDefault()
        e.stopImmediatePropagation()
    }

    onMounted(() => {
        document.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('contextmenu', handleContextMenu, true)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('contextmenu', handleContextMenu, true)
    })
}