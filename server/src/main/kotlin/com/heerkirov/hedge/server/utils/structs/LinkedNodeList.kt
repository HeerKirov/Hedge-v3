package com.heerkirov.hedge.server.utils.structs

/**
 * 一个更加原始的链表结构。它仅提供了原始链表的操作，对首尾元素进行操作，或者依次迭代元素。
 */
class LinkedNodeList<T>(collection: Collection<T>? = null) {
    private var _head: Node? = null
    private var _tail: Node? = null

    /**
     * 获得链表的头节点。
     */
    val head: Node? get() = _head

    /**
     * 获得链表的尾节点。
     */
    val tail: Node? get() = _tail

    /**
     * 获得链表的长度。这是一个有开销的操作。
     */
    val size: Int get() = if(_head != null && _tail != null) (_head!! distance _tail!!) + 1 else 0

    init {
        collection?.forEach { addLast(it) }
    }

    /**
     * 在链表头追加一个元素。
     */
    fun addFirst(element: T) {
        val node = Node(element, null, null)
        if(_head == null) {
            _head = node
            _tail = node
        }else{
            node.next = _head
            _head!!.prev = node
            _head = node
        }
    }

    /**
     * 在链表尾追加一个元素。
     */
    fun addLast(element: T) {
        val node = Node(element, null, null)
        if(_tail == null) {
            _tail = node
            _head = node
        }else{
            node.prev = _tail
            _tail!!.next = node
            _tail = node
        }
    }

    /**
     * 获得链表迭代器，从head节点迭代到tail节点。
     */
    fun iterator(): Iterator<T> {
        return if(_head == null || _tail == null) emptyList<T>().iterator()
        else _head!! iterTo _tail!!
    }

    inner class Node(val value: T, private var _prev: Node?, private var _next: Node?) {
        /**
         * 获得当前节点的下一个节点。
         */
        var next: Node?
            get() = _next
            internal set(value) { _next = value }

        /**
         * 获得当前节点的上一个节点。
         */
        var prev: Node?
            get() = _prev
            internal set(value) { _prev = value }

        val parent: LinkedNodeList<T> get() = this@LinkedNodeList

        /**
         * 获得当前节点到目标节点的距离。例如A-B-C，A与C的距离是2。当前节点必须在目标节点之前，否则会返回-1。
         */
        infix fun distance(node: Node): Int {
            if(this == node) return 0
            var a: Node? = this
            var b: Node? = node
            var cnt = 0
            while (a != null || b != null) {
                if(a != null) {
                    a = a._next
                    cnt += 1
                    if(a == b) return cnt
                }
                if(b != null) {
                    b = b._prev
                    cnt += 1
                    if(a == b) return cnt
                }
            }
            return -1
        }

        /**
         * 从当前节点迭代到目标节点，包括目标节点也会被迭代器列出。当前节点必须在目标节点之前，否则会一路迭代至尾节点。
         */
        infix fun iterTo(node: Node): Iterator<T> {
            return iterator {
                var cur = this@Node
                while(true) {
                    yield(cur.value)
                    if(cur == node || cur._next == null) break
                    cur = cur._next!!
                }
            }
        }

        /**
         * 在当前节点之前插入一个元素。
         */
        fun addPrev(element: T) {
            if(this == _head) addFirst(element)
            else {
                val node = Node(element, this._prev, this)
                this._prev?._next = node
                this._prev = node
            }
        }

        /**
         * 在当前节点之后插入一个元素。
         */
        fun addNext(element: T) {
            if(this == _tail) addLast(element)
            else {
                val node = Node(element, this, this._next)
                this._next?._prev = node
                this._next = node
            }
        }
    }
}