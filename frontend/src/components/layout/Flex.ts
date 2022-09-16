import { h, SetupContext } from "vue"

interface FlexProps {
    multiLine?: boolean
    horizontal?: "left" | "right" | "center" | "stretch" | "around"
    align?: "top" | "bottom" | "center" | "baseline" |"stretch"
    width?: number
    basis?: number
    grow?: number
    shrink?: number
    spacing?: number
}

export default function (props: FlexProps, { slots }: SetupContext) {
    const divStyle = {
        "display": "flex",
        "flex-wrap": (props.multiLine ? "wrap" : "nowrap") as "wrap" | "nowrap",
        "justify-content": props.horizontal ? justifyContentReflections[props.horizontal] : undefined,
        "align-items": props.align ? alignItemsReflections[props.align] : undefined,
        "gap": props.spacing ? `${props.spacing * 4}px` : undefined
    }

    const vNode = slots.default?.()

    if(vNode && (props.grow !== undefined || props.shrink !== undefined || props.width !== undefined || props.basis !== undefined)) {
        const width = props.width !== undefined ? `${props.width / vNode.length}%` : undefined
        const basis = props.basis !== undefined ? `${props.basis / vNode.length}%` : undefined
        for(const node of vNode) {
            const style: Record<string, any> = node.props?.style ?? {}

            if(width !== undefined) style["width"] = width
            if(basis !== undefined) style["flex-basis"] = basis
            if(props.grow !== undefined) style["flex-grow"] = props.grow
            if(props.shrink !== undefined) style["flex-shrink"] = props.shrink

            if(node.props) {
                node.props.style = style
            }else{
                node.props = { style }
            }
        }
    }

    return h("div", {style: divStyle}, vNode)
}

const justifyContentReflections = {
    "left": "flex-start",
    "right": "flex-end",
    "center": "center",
    "stretch": "space-between",
    "around": "space-around"
} as const

const alignItemsReflections = {
    "top": "flex-start",
    "bottom": "flex-end",
    "center": "center",
    "baseline": "baseline",
    "stretch": "stretch"
} as const
