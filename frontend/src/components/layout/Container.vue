<template>
    <div :class="$style.container">
        <slot/>
    </div>
</template>

<style module lang="sass">
.container
    margin: 0 auto
    width: auto
    height: 100%
    overflow-y: auto
    box-sizing: border-box
    @media screen and (min-width: 850px)
        max-width: 640px
    @media screen and (min-width: 1024px)
        max-width: 720px
    @media screen and (min-width: 1400px)
        max-width: 960px
</style>
