<script setup lang="ts">

// == Bottom Layout 底栏布局 ==
// 将区域分割为下方固定的底栏和其余区域可滚动的内容区域两块。
// 底栏放入slot#bottom，滚动内容放入slot#default。

</script>

<template>
    <div :class="$style['bottom-layout']">
        <div :class="$style['scroll-container']">
            <slot/>
        </div>
        <slot name="gap"/>
        <div>
            <slot name="bottom"/>
        </div>
    </div>
</template>

<style module lang="sass">
.bottom-layout
    display: flex
    flex-wrap: nowrap
    flex-direction: column
    height: 100%
    width: 100%

    > .scroll-container
        height: 100%
        overflow-y: auto
</style>
