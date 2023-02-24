<template>
    <div :class="$style.container">
        <div>
            <slot/>
        </div>
    </div>
</template>

<style module lang="sass">
.container
    width: 100%
    height: 100%
    overflow-y: auto
    box-sizing: border-box
    > div
        margin: 0 auto
        max-width: 95vw
        @media screen and (min-width: 720px)
            max-width: 640px
        @media screen and (min-width: 1024px)
            max-width: 850px
        @media screen and (min-width: 1400px)
            max-width: 1080px
</style>
