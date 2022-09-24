import { SetupContext } from "vue"

interface FlexItemProps {
    width?: number
    height?: number
    basis?: number
    shrink?: number
    grow?: number
}

export default function (props: FlexItemProps, { slots } : SetupContext) {
    const vNode = slots.default?.()

    if(vNode && vNode.length && (props.width !== undefined || props.height !== undefined || props.basis !== undefined || props.shrink !== undefined || props.grow !== undefined)) {
        const width = props.width !== undefined ? `${props.width / vNode.length}%` : undefined
        const height = props.height !== undefined ? `${props.height / vNode.length}%` : undefined
        const basis = props.basis !== undefined ? `${props.basis / vNode.length}%` : undefined
        for(const node of vNode) {
            const style: Record<string, any> = node.props?.style ?? {}

            if(width !== undefined) style["width"] = width
            if(height !== undefined) style["height"] = height
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

    return vNode
}
