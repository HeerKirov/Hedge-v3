<template>
    <div class="container">
        <slot/>
    </div>
</template>

<style scoped lang="sass">
.container
    margin: 0 auto
    width: auto
    @media screen and (min-width: 850px)
        max-width: 640px
    @media screen and (min-width: 1024px)
        max-width: 720px
    @media screen and (min-width: 1400px)
        max-width: 960px
</style>
