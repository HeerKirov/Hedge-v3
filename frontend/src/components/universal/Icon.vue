<script setup lang="ts">
import { computed } from "vue"
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"

type Size = "2xs" | "xs" | "sm" | "lg" | "xl" | "2xl" | "1x" | "2x" | "3x" | "4x" | "5x" | "6x" | "7x" | "8x" | "9x" |"10x"

const props = defineProps<{
    /**
     * 图标名称。一般来说，只写iconName即可。可以添加后缀词"regular"/"solid"等表示其分类。
     */
    icon: string
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
}>()

const REGULAR_SUFFIX = "-regular"
const SOLID_SUFFIX = "-solid"

const icon = computed(() => {
    if(props.icon.endsWith(REGULAR_SUFFIX)) {
        return ["far", props.icon.slice(0, props.icon.length - REGULAR_SUFFIX.length)]
    }else if(props.icon.endsWith(SOLID_SUFFIX)) {
        return ["far", props.icon.slice(0, props.icon.length - SOLID_SUFFIX.length)]
    }else{
        return ["fas", props.icon]
    }
})

</script>

<template>
    <FontAwesomeIcon
        :icon="icon" :size="size" fixed-width
        :spin="spin || spinReverse" :spinReverse="spinReverse"
        :beat="beat && !fade" :fade="fade && !beat" :beatFade="beat && fade"
        :bounce="bounce" :shake="shake"
    />
</template>

<script lang="ts">
import { library } from "@fortawesome/fontawesome-svg-core"

import {
    faClose, faStar, faStarHalf, faStarHalfStroke, faSave, faTrash, faFolderOpen, faPlus, faMinus,
    faArrowLeft, faArrowRight, faArrowUp, faArrowDown, faAngleLeft, faAngleRight, faAngleDown,
    faCaretDown, faCaretRight, faCaretUp, faCaretLeft, faSortAlphaDown,
    faCircleNotch, faCheck, faFile, faCodeBranch, faFingerprint, faBars,
    faGear, faCircleQuestion, faClipboard, faFilter, faShareSquare, faShareAltSquare,
    faHouse, faCalendarAlt, faClone, faUserTag, faHashtag, faTag, faCode, faSpinner, faFolder, faArchive, faThumbtack,
    faCloudSun, faCoffee, faSearch, faPlusSquare, faFileInvoice, faGrinSquint, faServer, faCoins,
    faLock, faLockOpen, faEthernet, faBullseye, faBusinessTime, faCircle, faReply,
    faQuestion, faCopyright, faBookmark, faUserNinja, faPaintBrush, faSwatchbook, faStamp,
    faObjectGroup, faObjectUngroup, faBorderStyle, faBuilding, faLink, faHeart, faPager,
    faEdit, faEllipsisV, faChessQueen, faChess, faList, faTree, faCompress, faCompressArrowsAlt, faColumns,
    faPenNib, faExclamationTriangle, faExclamation, faCommentDots, faImages, faIdCard, faUndo, faRedo,
    faHistory, faAdjust, faDatabase, faCheckSquare, faCheckCircle, faSyncAlt, faFileImage, faImage, faVideo,
    faInfo, faDiceD6, faExternalLinkAlt, faEye, faPlay, faPause, faVolumeUp, faVolumeDown, faVolumeOff, faVolumeMute,
    faAngleDoubleRight, faSortAmountDown, faCalendar, faThList, faExchangeAlt, faEarListen, faStop, faCopy, faScissors,
    faEquals, faHandLizard, faHandScissors, faFaceSmileBeam, faFaceLaughBeam, faMarker, faHighlighter, faJoint, faLinkSlash
} from "@fortawesome/free-solid-svg-icons"

import {
    faStar as farStar, faCheckSquare as farCheckSquare
} from "@fortawesome/free-regular-svg-icons"

library.add(
    faClose, faStar, faStarHalf, faStarHalfStroke, faSave, faTrash, faFolderOpen, faPlus, faMinus,
    faArrowLeft, faArrowRight, faArrowUp, faArrowDown, faAngleLeft, faAngleRight, faAngleDown,
    faCaretDown, faCaretRight, faCaretUp, faCaretLeft, faSortAlphaDown,
    faCircleNotch, faCheck, faFile, faCodeBranch, faFingerprint, faBars,
    faGear, faCircleQuestion, faClipboard, faFilter, faShareSquare, faShareAltSquare,
    faHouse, faCalendarAlt, faClone, faUserTag, faHashtag, faTag, faCode, faSpinner, faFolder, faArchive, faThumbtack,
    faCloudSun, faCoffee, faSearch, faPlusSquare, faFileInvoice, faGrinSquint, faServer, faCoins,
    faLock, faLockOpen, faEthernet, faBullseye, faBusinessTime, faCircle, faReply,
    faQuestion, faCopyright, faBookmark, faUserNinja, faPaintBrush, faSwatchbook, faStamp,
    faObjectGroup, faObjectUngroup, faBorderStyle, faBuilding, faLink, faHeart, faPager,
    faEdit, faEllipsisV, faChessQueen, faChess, faList, faTree, faCompress, faCompressArrowsAlt, faColumns,
    faPenNib, faExclamationTriangle, faExclamation, faCommentDots, faImages, faIdCard, faUndo, faRedo,
    faHistory, faAdjust, faDatabase, faCheckSquare, faCheckCircle, faSyncAlt, faFileImage, faImage, faVideo,
    faInfo, faDiceD6, faExternalLinkAlt, faEye, faPlay, faPause, faVolumeUp, faVolumeDown, faVolumeOff, faVolumeMute,
    faAngleDoubleRight, faSortAmountDown, faCalendar, faThList, faExchangeAlt, faEarListen, faStop, faCopy, faScissors,
    faEquals, faHandLizard, faHandScissors, faFaceSmileBeam, faFaceLaughBeam, faMarker, faHighlighter, faJoint, faLinkSlash
)
library.add(farStar, farCheckSquare)

</script>
