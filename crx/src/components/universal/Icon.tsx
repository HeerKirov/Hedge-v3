import { styled, css } from "styled-components"
import { IconProp } from "@fortawesome/fontawesome-svg-core"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { SPACINGS } from "@/styles"

type Size = "2xs" | "xs" | "sm" | "lg" | "xl" | "2xl" | "1x" | "2x" | "3x" | "4x" | "5x" | "6x" | "7x" | "8x" | "9x" |"10x"

interface IconProps {
    /**
     * 图标名称。一般来说，只写iconName即可。可以添加后缀词"regular"/"solid"等表示其分类。
     */
    icon: IconProp
    /**
     * 图标尺寸。
     */
    size?: Size
    /**
     * 图标旋转，类似loading icon。
     */
    spin?: boolean
    /**
     * 图标反向旋转。
     */
    spinReverse?: boolean
    /**
     * 图标向上跳动。
     */
    bounce?: boolean
    /**
     * 图标间歇性地抖动。
     */
    shake?: boolean
    /**
     * 图标忽大忽小地心跳。
     */
    beat?: boolean
    /**
     * 图标忽明忽暗地闪烁。
     */
    fade?: boolean
    /**
     * margin-right。
     */
    mr?: number
    /**
     * margin-left。
     */
    ml?: number
    onClick?(): void
}

export function Icon(props: IconProps) {
    return (
        <StyledIcon $mr={props.mr} $ml={props.ml}
            icon={props.icon} size={props.size} 
            spin={props.spin} spinReverse={props.spinReverse} 
            bounce={props.bounce} shake={props.shake} 
            beat={props.beat} fade={props.fade}
            onClick={props.onClick}
        />
    )
}

const StyledIcon = styled(FontAwesomeIcon)<{ $mr?: number, $ml?: number }>`
    ${p => p.$mr && css`margin-right: ${SPACINGS[p.$mr]};`}
    ${p => p.$ml && css`margin-left: ${SPACINGS[p.$ml]};`}
`

import { library } from "@fortawesome/fontawesome-svg-core"
import {
    faArrowRight, faArrowDownWideShort, faArrowUpShortWide, faCloudArrowDown, faCopy, faCloudUpload, faCloudDownload,
    faCalendar, faCalendarCheck, faCalendarDay, faCalendarPlus, faCalendarWeek, faCaretDown, faCaretRight, faCaretUp, faCheck, faClose, faCircle,
    faDownload, faEdit, faFile, faFileExport, faFileImport, faFileInvoice, faFolder, faFolderOpen, faPlus, faCalendarAlt,
    faRecordVinyl, faSave, faSearch, faServer, faStar, faToolbox, faTrash, faUpload, faWarning, faToggleOn, faUpRightFromSquare,
    faGrinSquint, faScrewdriverWrench, faTags, faIdCard, faImage, faBullseye, faPager, faClock, faBusinessTime, faCircleNotch,
    faPlay, faPause, faStop, faGear
} from "@fortawesome/free-solid-svg-icons"
import {
    faStar as faStarRegular, faSave as faSaveRegular
} from "@fortawesome/free-regular-svg-icons"

library.add(
    faArrowRight, faArrowDownWideShort, faArrowUpShortWide, faCloudArrowDown, faCopy, faCloudUpload, faCloudDownload,
    faCalendar, faCalendarCheck, faCalendarDay, faCalendarPlus, faCalendarWeek, faCaretDown, faCaretRight, faCaretUp, faCheck, faClose, faCircle,
    faDownload, faEdit, faFile, faFileExport, faFileImport, faFileInvoice, faFolder, faFolderOpen, faPlus, faCalendarAlt,
    faRecordVinyl, faSave, faSearch, faServer, faStar, faToolbox, faTrash, faUpload, faWarning, faToggleOn, faUpRightFromSquare,
    faGrinSquint, faScrewdriverWrench, faTags, faIdCard, faImage, faBullseye, faPager, faClock, faBusinessTime, faCircleNotch,
    faPlay, faPause, faStop, faGear
)
library.add(faStarRegular, faSaveRegular)
