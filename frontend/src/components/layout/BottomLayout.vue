<script setup lang="ts">

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
