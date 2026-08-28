//#region node_modules/orderedmap/dist/index.js
function e(e) {
	this.content = e;
}
e.prototype = {
	constructor: e,
	find: function(e) {
		for (var t = 0; t < this.content.length; t += 2) if (this.content[t] === e) return t;
		return -1;
	},
	get: function(e) {
		var t = this.find(e);
		return t == -1 ? void 0 : this.content[t + 1];
	},
	update: function(t, n, r) {
		var i = r && r != t ? this.remove(r) : this, a = i.find(t), o = i.content.slice();
		return a == -1 ? o.push(r || t, n) : (o[a + 1] = n, r && (o[a] = r)), new e(o);
	},
	remove: function(t) {
		var n = this.find(t);
		if (n == -1) return this;
		var r = this.content.slice();
		return r.splice(n, 2), new e(r);
	},
	addToStart: function(t, n) {
		return new e([t, n].concat(this.remove(t).content));
	},
	addToEnd: function(t, n) {
		var r = this.remove(t).content.slice();
		return r.push(t, n), new e(r);
	},
	addBefore: function(t, n, r) {
		var i = this.remove(n), a = i.content.slice(), o = i.find(t);
		return a.splice(o == -1 ? a.length : o, 0, n, r), new e(a);
	},
	forEach: function(e) {
		for (var t = 0; t < this.content.length; t += 2) e(this.content[t], this.content[t + 1]);
	},
	prepend: function(t) {
		return t = e.from(t), t.size ? new e(t.content.concat(this.subtract(t).content)) : this;
	},
	append: function(t) {
		return t = e.from(t), t.size ? new e(this.subtract(t).content.concat(t.content)) : this;
	},
	subtract: function(t) {
		var n = this;
		t = e.from(t);
		for (var r = 0; r < t.content.length; r += 2) n = n.remove(t.content[r]);
		return n;
	},
	toObject: function() {
		var e = {};
		return this.forEach(function(t, n) {
			e[t] = n;
		}), e;
	},
	get size() {
		return this.content.length >> 1;
	}
}, e.from = function(t) {
	if (t instanceof e) return t;
	var n = [];
	if (t) for (var r in t) n.push(r, t[r]);
	return new e(n);
};
//#endregion
//#region node_modules/prosemirror-model/dist/index.js
function t(e, n, a) {
	for (let o = 0;; o++) {
		if (o == e.childCount || o == n.childCount) return e.childCount == n.childCount ? null : a;
		let s = e.child(o), c = n.child(o);
		if (s == c) {
			a += s.nodeSize;
			continue;
		}
		if (!s.sameMarkup(c)) return a;
		if (s.isText && s.text != c.text) {
			let e = s.text, t = c.text, n = 0;
			for (; e[n] == t[n]; n++) a++;
			return n && n < e.length && n < t.length && i(e.charCodeAt(n - 1)) && r(e.charCodeAt(n)) && a--, a;
		}
		if (s.content.size || c.content.size) {
			let e = t(s.content, c.content, a + 1);
			if (e != null) return e;
		}
		a += s.nodeSize;
	}
}
function n(e, t, a, o) {
	for (let s = e.childCount, c = t.childCount;;) {
		if (s == 0 || c == 0) return s == c ? null : {
			a,
			b: o
		};
		let l = e.child(--s), u = t.child(--c), d = l.nodeSize;
		if (l == u) {
			a -= d, o -= d;
			continue;
		}
		if (!l.sameMarkup(u)) return {
			a,
			b: o
		};
		if (l.isText && l.text != u.text) {
			let e = l.text, t = u.text, n = e.length, s = t.length;
			for (; n > 0 && s > 0 && e[n - 1] == t[s - 1];) n--, s--, a--, o--;
			return n && s && n < e.length && i(e.charCodeAt(n - 1)) && r(e.charCodeAt(n)) && (a++, o++), {
				a,
				b: o
			};
		}
		if (l.content.size || u.content.size) {
			let e = n(l.content, u.content, a - 1, o - 1);
			if (e) return e;
		}
		a -= d, o -= d;
	}
}
function r(e) {
	return e >= 56320 && e < 57344;
}
function i(e) {
	return e >= 55296 && e < 56320;
}
var a = class e {
	constructor(e, t) {
		if (this.content = e, this.size = t || 0, t == null) for (let t = 0; t < e.length; t++) this.size += e[t].nodeSize;
	}
	nodesBetween(e, t, n, r = 0, i) {
		for (let a = 0, o = 0; o < t; a++) {
			let s = this.content[a], c = o + s.nodeSize;
			if (c > e && n(s, r + o, i || null, a) !== !1 && s.content.size) {
				let i = o + 1;
				s.nodesBetween(Math.max(0, e - i), Math.min(s.content.size, t - i), n, r + i);
			}
			o = c;
		}
	}
	descendants(e) {
		this.nodesBetween(0, this.size, e);
	}
	textBetween(e, t, n, r) {
		let i = "", a = !0;
		return this.nodesBetween(e, t, (o, s) => {
			let c = o.isText ? o.text.slice(Math.max(e, s) - s, t - s) : o.isLeaf ? r ? typeof r == "function" ? r(o) : r : o.type.spec.leafText ? o.type.spec.leafText(o) : "" : "";
			o.isBlock && (o.isLeaf && c || o.isTextblock) && n && (a ? a = !1 : i += n), i += c;
		}, 0), i;
	}
	append(t) {
		if (!t.size) return this;
		if (!this.size) return t;
		let n = this.lastChild, r = t.firstChild, i = this.content.slice(), a = 0;
		for (n.isText && n.sameMarkup(r) && (i[i.length - 1] = n.withText(n.text + r.text), a = 1); a < t.content.length; a++) i.push(t.content[a]);
		return new e(i, this.size + t.size);
	}
	cut(t, n = this.size) {
		if (t == 0 && n == this.size) return this;
		let r = [], i = 0;
		if (n > t) for (let e = 0, a = 0; a < n; e++) {
			let o = this.content[e], s = a + o.nodeSize;
			s > t && ((a < t || s > n) && (o = o.isText ? o.cut(Math.max(0, t - a), Math.min(o.text.length, n - a)) : o.cut(Math.max(0, t - a - 1), Math.min(o.content.size, n - a - 1))), r.push(o), i += o.nodeSize), a = s;
		}
		return new e(r, i);
	}
	cutByIndex(t, n) {
		return t == n ? e.empty : t == 0 && n == this.content.length ? this : new e(this.content.slice(t, n));
	}
	replaceChild(t, n) {
		let r = this.content[t];
		if (r == n) return this;
		let i = this.content.slice(), a = this.size + n.nodeSize - r.nodeSize;
		return i[t] = n, new e(i, a);
	}
	addToStart(t) {
		return new e([t].concat(this.content), this.size + t.nodeSize);
	}
	addToEnd(t) {
		return new e(this.content.concat(t), this.size + t.nodeSize);
	}
	eq(e) {
		if (this.content.length != e.content.length) return !1;
		for (let t = 0; t < this.content.length; t++) if (!this.content[t].eq(e.content[t])) return !1;
		return !0;
	}
	get firstChild() {
		return this.content.length ? this.content[0] : null;
	}
	get lastChild() {
		return this.content.length ? this.content[this.content.length - 1] : null;
	}
	get childCount() {
		return this.content.length;
	}
	child(e) {
		let t = this.content[e];
		if (!t) throw RangeError("Index " + e + " out of range for " + this);
		return t;
	}
	maybeChild(e) {
		return this.content[e] || null;
	}
	forEach(e) {
		for (let t = 0, n = 0; t < this.content.length; t++) {
			let r = this.content[t];
			e(r, n, t), n += r.nodeSize;
		}
	}
	findDiffStart(e, n = 0) {
		return t(this, e, n);
	}
	findDiffEnd(e, t = this.size, r = e.size) {
		return n(this, e, t, r);
	}
	findIndex(e) {
		if (e == 0) return s(0, e);
		if (e == this.size) return s(this.content.length, e);
		if (e > this.size || e < 0) throw RangeError(`Position ${e} outside of fragment (${this})`);
		for (let t = 0, n = 0;; t++) {
			let r = this.child(t), i = n + r.nodeSize;
			if (i >= e) return i == e ? s(t + 1, i) : s(t, n);
			n = i;
		}
	}
	toString() {
		return "<" + this.toStringInner() + ">";
	}
	toStringInner() {
		return this.content.join(", ");
	}
	toJSON() {
		return this.content.length ? this.content.map((e) => e.toJSON()) : null;
	}
	static fromJSON(t, n) {
		if (!n) return e.empty;
		if (!Array.isArray(n)) throw RangeError("Invalid input for Fragment.fromJSON");
		return e.fromArray(n.map(t.nodeFromJSON));
	}
	static fromArray(t) {
		if (!t.length) return e.empty;
		let n, r = 0;
		for (let e = 0; e < t.length; e++) {
			let i = t[e];
			r += i.nodeSize, e && i.isText && t[e - 1].sameMarkup(i) ? (n || (n = t.slice(0, e)), n[n.length - 1] = i.withText(n[n.length - 1].text + i.text)) : n && n.push(i);
		}
		return new e(n || t, r);
	}
	static from(t) {
		if (!t) return e.empty;
		if (t instanceof e) return t;
		if (Array.isArray(t)) return this.fromArray(t);
		if (t.attrs) return new e([t], t.nodeSize);
		throw RangeError("Can not convert " + t + " to a Fragment" + (t.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
	}
};
a.empty = new a([], 0);
var o = {
	index: 0,
	offset: 0
};
function s(e, t) {
	return o.index = e, o.offset = t, o;
}
function c(e, t) {
	if (e === t) return !0;
	if (!(e && typeof e == "object") || !(t && typeof t == "object")) return !1;
	let n = Array.isArray(e);
	if (Array.isArray(t) != n) return !1;
	if (n) {
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!c(e[n], t[n])) return !1;
	} else {
		for (let n in e) if (!(n in t) || !c(e[n], t[n])) return !1;
		for (let n in t) if (!(n in e)) return !1;
	}
	return !0;
}
var l = class e {
	constructor(e, t) {
		this.type = e, this.attrs = t;
	}
	addToSet(e) {
		let t, n = !1;
		for (let r = 0; r < e.length; r++) {
			let i = e[r];
			if (this.eq(i)) return e;
			if (this.type.excludes(i.type)) t || (t = e.slice(0, r));
			else if (i.type.excludes(this.type)) return e;
			else !n && i.type.rank > this.type.rank && (t || (t = e.slice(0, r)), t.push(this), n = !0), t && t.push(i);
		}
		return t || (t = e.slice()), n || t.push(this), t;
	}
	removeFromSet(e) {
		for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return e.slice(0, t).concat(e.slice(t + 1));
		return e;
	}
	isInSet(e) {
		for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return !0;
		return !1;
	}
	eq(e) {
		return this == e || this.type == e.type && c(this.attrs, e.attrs);
	}
	toJSON() {
		let e = { type: this.type.name };
		for (let t in this.attrs) {
			e.attrs = this.attrs;
			break;
		}
		return e;
	}
	static fromJSON(e, t) {
		if (!t) throw RangeError("Invalid input for Mark.fromJSON");
		let n = e.marks[t.type];
		if (!n) throw RangeError(`There is no mark type ${t.type} in this schema`);
		let r = n.create(t.attrs);
		return n.checkAttrs(r.attrs), r;
	}
	static sameSet(e, t) {
		if (e == t) return !0;
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!e[n].eq(t[n])) return !1;
		return !0;
	}
	static setFrom(t) {
		if (!t || Array.isArray(t) && t.length == 0) return e.none;
		if (t instanceof e) return [t];
		let n = t.slice();
		return n.sort((e, t) => e.type.rank - t.type.rank), n;
	}
};
l.none = [];
var u = class extends Error {}, d = class e {
	constructor(e, t, n) {
		this.content = e, this.openStart = t, this.openEnd = n;
	}
	get size() {
		return this.content.size - this.openStart - this.openEnd;
	}
	insertAt(t, n) {
		let r = p(this.content, t + this.openStart, n, this.openStart + 1, this.openEnd + 1);
		return r && new e(r, this.openStart, this.openEnd);
	}
	removeBetween(t, n) {
		return new e(f(this.content, t + this.openStart, n + this.openStart), this.openStart, this.openEnd);
	}
	eq(e) {
		return this.content.eq(e.content) && this.openStart == e.openStart && this.openEnd == e.openEnd;
	}
	toString() {
		return this.content + "(" + this.openStart + "," + this.openEnd + ")";
	}
	toJSON() {
		if (!this.content.size) return null;
		let e = { content: this.content.toJSON() };
		return this.openStart > 0 && (e.openStart = this.openStart), this.openEnd > 0 && (e.openEnd = this.openEnd), e;
	}
	static fromJSON(t, n) {
		if (!n) return e.empty;
		let r = n.openStart || 0, i = n.openEnd || 0;
		if (typeof r != "number" || typeof i != "number") throw RangeError("Invalid input for Slice.fromJSON");
		return new e(a.fromJSON(t, n.content), r, i);
	}
	static maxOpen(t, n = !0) {
		let r = 0, i = 0;
		for (let e = t.firstChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.firstChild) r++;
		for (let e = t.lastChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.lastChild) i++;
		return new e(t, r, i);
	}
};
d.empty = new d(a.empty, 0, 0);
function f(e, t, n) {
	let { index: r, offset: i } = e.findIndex(t), a = e.maybeChild(r), { index: o, offset: s } = e.findIndex(n);
	if (i == t || a.isText) {
		if (s != n && !e.child(o).isText) throw RangeError("Removing non-flat range");
		return e.cut(0, t).append(e.cut(n));
	}
	if (r != o) throw RangeError("Removing non-flat range");
	return e.replaceChild(r, a.copy(f(a.content, t - i - 1, n - i - 1)));
}
function p(e, t, n, r, i, a) {
	let { index: o, offset: s } = e.findIndex(t), c = e.maybeChild(o);
	if (s == t || c.isText) return a && r <= 0 && i <= 0 && !a.canReplace(o, o, n) ? null : e.cut(0, t).append(n).append(e.cut(t));
	let l = p(c.content, t - s - 1, n, o == 0 ? r - 1 : 0, o == e.childCount - 1 ? i - 1 : 0, c);
	return l && e.replaceChild(o, c.copy(l));
}
function m(e, t, n) {
	if (n.openStart > e.depth) throw new u("Inserted content deeper than insertion position");
	if (e.depth - n.openStart != t.depth - n.openEnd) throw new u("Inconsistent open depths");
	return h(e, t, n, 0);
}
function h(e, t, n, r) {
	let i = e.index(r), a = e.node(r);
	if (i == t.index(r) && r < e.depth - n.openStart) {
		let o = h(e, t, n, r + 1);
		return a.copy(a.content.replaceChild(i, o));
	}
	if (!n.content.size) return b(a, te(e, t, r));
	if (!n.openStart && !n.openEnd && e.depth == r && t.depth == r) {
		let r = e.parent, i = r.content;
		return b(r, i.cut(0, e.parentOffset).append(n.content).append(i.cut(t.parentOffset)));
	}
	{
		let { start: i, end: o } = ne(n, e);
		return b(a, ee(e, i, o, t, r));
	}
}
function g(e, t) {
	if (!t.type.compatibleContent(e.type)) throw new u("Cannot join " + t.type.name + " onto " + e.type.name);
}
function _(e, t, n) {
	let r = e.node(n);
	return g(r, t.node(n)), r;
}
function v(e, t) {
	let n = t.length - 1;
	n >= 0 && e.isText && e.sameMarkup(t[n]) ? t[n] = e.withText(t[n].text + e.text) : t.push(e);
}
function y(e, t, n, r) {
	let i = (t || e).node(n), a = 0, o = t ? t.index(n) : i.childCount;
	e && (a = e.index(n), e.depth > n ? a++ : e.textOffset && (v(e.nodeAfter, r), a++));
	for (let e = a; e < o; e++) v(i.child(e), r);
	t && t.depth == n && t.textOffset && v(t.nodeBefore, r);
}
function b(e, t) {
	if (!e.type.validContent(t)) throw new u("Invalid content for node " + e.type.name);
	return e.copy(t);
}
function ee(e, t, n, r, i) {
	let o = e.depth > i && _(e, t, i + 1), s = r.depth > i && _(n, r, i + 1), c = [];
	return y(null, e, i, c), o && s && t.index(i) == n.index(i) ? (g(o, s), v(b(o, ee(e, t, n, r, i + 1)), c)) : (o && v(b(o, te(e, t, i + 1)), c), y(t, n, i, c), s && v(b(s, te(n, r, i + 1)), c)), y(r, null, i, c), new a(c);
}
function te(e, t, n) {
	let r = [];
	return y(null, e, n, r), e.depth > n && v(b(_(e, t, n + 1), te(e, t, n + 1)), r), y(t, null, n, r), new a(r);
}
function ne(e, t) {
	let n = t.depth - e.openStart, r = t.node(n).copy(e.content);
	for (let e = n - 1; e >= 0; e--) r = t.node(e).copy(a.from(r));
	return {
		start: r.resolveNoCache(e.openStart + n),
		end: r.resolveNoCache(r.content.size - e.openEnd - n)
	};
}
var re = class e {
	constructor(e, t, n) {
		this.pos = e, this.path = t, this.parentOffset = n, this.depth = t.length / 3 - 1;
	}
	resolveDepth(e) {
		return e == null ? this.depth : e < 0 ? this.depth + e : e;
	}
	get parent() {
		return this.node(this.depth);
	}
	get doc() {
		return this.node(0);
	}
	node(e) {
		return this.path[this.resolveDepth(e) * 3];
	}
	index(e) {
		return this.path[this.resolveDepth(e) * 3 + 1];
	}
	indexAfter(e) {
		return e = this.resolveDepth(e), this.index(e) + (e == this.depth && !this.textOffset ? 0 : 1);
	}
	start(e) {
		return e = this.resolveDepth(e), e == 0 ? 0 : this.path[e * 3 - 1] + 1;
	}
	end(e) {
		return e = this.resolveDepth(e), this.start(e) + this.node(e).content.size;
	}
	before(e) {
		if (e = this.resolveDepth(e), !e) throw RangeError("There is no position before the top-level node");
		return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1];
	}
	after(e) {
		if (e = this.resolveDepth(e), !e) throw RangeError("There is no position after the top-level node");
		return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1] + this.path[e * 3].nodeSize;
	}
	get textOffset() {
		return this.pos - this.path[this.path.length - 1];
	}
	get nodeAfter() {
		let e = this.parent, t = this.index(this.depth);
		if (t == e.childCount) return null;
		let n = this.pos - this.path[this.path.length - 1], r = e.child(t);
		return n ? e.child(t).cut(n) : r;
	}
	get nodeBefore() {
		let e = this.index(this.depth), t = this.pos - this.path[this.path.length - 1];
		return t ? this.parent.child(e).cut(0, t) : e == 0 ? null : this.parent.child(e - 1);
	}
	posAtIndex(e, t) {
		t = this.resolveDepth(t);
		let n = this.path[t * 3], r = t == 0 ? 0 : this.path[t * 3 - 1] + 1;
		for (let t = 0; t < e; t++) r += n.child(t).nodeSize;
		return r;
	}
	marks() {
		let e = this.parent, t = this.index();
		if (e.content.size == 0) return l.none;
		if (this.textOffset) return e.child(t).marks;
		let n = e.maybeChild(t - 1), r = e.maybeChild(t);
		if (!n) {
			let e = n;
			n = r, r = e;
		}
		let i = n.marks;
		for (var a = 0; a < i.length; a++) i[a].type.spec.inclusive === !1 && (!r || !i[a].isInSet(r.marks)) && (i = i[a--].removeFromSet(i));
		return i;
	}
	marksAcross(e) {
		let t = this.parent.maybeChild(this.index());
		if (!t || !t.isInline) return null;
		let n = t.marks, r = e.parent.maybeChild(e.index());
		for (var i = 0; i < n.length; i++) n[i].type.spec.inclusive === !1 && (!r || !n[i].isInSet(r.marks)) && (n = n[i--].removeFromSet(n));
		return n;
	}
	sharedDepth(e) {
		for (let t = this.depth; t > 0; t--) if (this.start(t) <= e && this.end(t) >= e) return t;
		return 0;
	}
	blockRange(e = this, t) {
		if (e.pos < this.pos) return e.blockRange(this);
		for (let n = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); n >= 0; n--) if (e.pos <= this.end(n) && (!t || t(this.node(n)))) return new se(this, e, n);
		return null;
	}
	sameParent(e) {
		return this.pos - this.parentOffset == e.pos - e.parentOffset;
	}
	max(e) {
		return e.pos > this.pos ? e : this;
	}
	min(e) {
		return e.pos < this.pos ? e : this;
	}
	toString() {
		let e = "";
		for (let t = 1; t <= this.depth; t++) e += (e ? "/" : "") + this.node(t).type.name + "_" + this.index(t - 1);
		return e + ":" + this.parentOffset;
	}
	static resolve(t, n) {
		if (!(n >= 0 && n <= t.content.size)) throw RangeError("Position " + n + " out of range");
		let r = [], i = 0, a = n;
		for (let e = t;;) {
			let { index: t, offset: n } = e.content.findIndex(a), o = a - n;
			if (r.push(e, t, i + n), !o || (e = e.child(t), e.isText)) break;
			a = o - 1, i += n + 1;
		}
		return new e(n, r, a);
	}
	static resolveCached(t, n) {
		let r = oe.get(t);
		if (r) for (let e = 0; e < r.elts.length; e++) {
			let t = r.elts[e];
			if (t.pos == n) return t;
		}
		else oe.set(t, r = new ie());
		let i = r.elts[r.i] = e.resolve(t, n);
		return r.i = (r.i + 1) % ae, i;
	}
}, ie = class {
	constructor() {
		this.elts = [], this.i = 0;
	}
}, ae = 12, oe = /* @__PURE__ */ new WeakMap(), se = class {
	constructor(e, t, n) {
		this.$from = e, this.$to = t, this.depth = n;
	}
	get start() {
		return this.$from.before(this.depth + 1);
	}
	get end() {
		return this.$to.after(this.depth + 1);
	}
	get parent() {
		return this.$from.node(this.depth);
	}
	get startIndex() {
		return this.$from.index(this.depth);
	}
	get endIndex() {
		return this.$to.indexAfter(this.depth);
	}
}, ce = Object.create(null), le = class e {
	constructor(e, t, n, r = l.none) {
		this.type = e, this.attrs = t, this.marks = r, this.content = n || a.empty;
	}
	get children() {
		return this.content.content;
	}
	get nodeSize() {
		return this.isLeaf ? 1 : 2 + this.content.size;
	}
	get childCount() {
		return this.content.childCount;
	}
	child(e) {
		return this.content.child(e);
	}
	maybeChild(e) {
		return this.content.maybeChild(e);
	}
	forEach(e) {
		this.content.forEach(e);
	}
	nodesBetween(e, t, n, r = 0) {
		this.content.nodesBetween(e, t, n, r, this);
	}
	descendants(e) {
		this.nodesBetween(0, this.content.size, e);
	}
	get textContent() {
		return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
	}
	textBetween(e, t, n, r) {
		return this.content.textBetween(e, t, n, r);
	}
	get firstChild() {
		return this.content.firstChild;
	}
	get lastChild() {
		return this.content.lastChild;
	}
	eq(e) {
		return this == e || this.sameMarkup(e) && this.content.eq(e.content);
	}
	sameMarkup(e) {
		return this.hasMarkup(e.type, e.attrs, e.marks);
	}
	hasMarkup(e, t, n) {
		return this.type == e && c(this.attrs, t || e.defaultAttrs || ce) && l.sameSet(this.marks, n || l.none);
	}
	copy(t = null) {
		return t == this.content ? this : new e(this.type, this.attrs, t, this.marks);
	}
	mark(t) {
		return t == this.marks ? this : new e(this.type, this.attrs, this.content, t);
	}
	cut(e, t = this.content.size) {
		return e == 0 && t == this.content.size ? this : this.copy(this.content.cut(e, t));
	}
	slice(e, t = this.content.size, n = !1) {
		if (e == t) return d.empty;
		let r = this.resolve(e), i = this.resolve(t), a = n ? 0 : r.sharedDepth(t), o = r.start(a);
		return new d(r.node(a).content.cut(r.pos - o, i.pos - o), r.depth - a, i.depth - a);
	}
	replace(e, t, n) {
		return m(this.resolve(e), this.resolve(t), n);
	}
	nodeAt(e) {
		for (let t = this;;) {
			let { index: n, offset: r } = t.content.findIndex(e);
			if (t = t.maybeChild(n), !t) return null;
			if (r == e || t.isText) return t;
			e -= r + 1;
		}
	}
	childAfter(e) {
		let { index: t, offset: n } = this.content.findIndex(e);
		return {
			node: this.content.maybeChild(t),
			index: t,
			offset: n
		};
	}
	childBefore(e) {
		if (e == 0) return {
			node: null,
			index: 0,
			offset: 0
		};
		let { index: t, offset: n } = this.content.findIndex(e);
		if (n < e) return {
			node: this.content.child(t),
			index: t,
			offset: n
		};
		let r = this.content.child(t - 1);
		return {
			node: r,
			index: t - 1,
			offset: n - r.nodeSize
		};
	}
	resolve(e) {
		return re.resolveCached(this, e);
	}
	resolveNoCache(e) {
		return re.resolve(this, e);
	}
	rangeHasMark(e, t, n) {
		let r = !1;
		return t > e && this.nodesBetween(e, t, (e) => (n.isInSet(e.marks) && (r = !0), !r)), r;
	}
	get isBlock() {
		return this.type.isBlock;
	}
	get isTextblock() {
		return this.type.isTextblock;
	}
	get inlineContent() {
		return this.type.inlineContent;
	}
	get isInline() {
		return this.type.isInline;
	}
	get isText() {
		return this.type.isText;
	}
	get isLeaf() {
		return this.type.isLeaf;
	}
	get isAtom() {
		return this.type.isAtom;
	}
	toString() {
		if (this.type.spec.toDebugString) return this.type.spec.toDebugString(this);
		let e = this.type.name;
		return this.content.size && (e += "(" + this.content.toStringInner() + ")"), de(this.marks, e);
	}
	contentMatchAt(e) {
		let t = this.type.contentMatch.matchFragment(this.content, 0, e);
		if (!t) throw Error("Called contentMatchAt on a node with invalid content");
		return t;
	}
	canReplace(e, t, n = a.empty, r = 0, i = n.childCount) {
		let o = this.contentMatchAt(e).matchFragment(n, r, i), s = o && o.matchFragment(this.content, t);
		if (!s || !s.validEnd) return !1;
		for (let e = r; e < i; e++) if (!this.type.allowsMarks(n.child(e).marks)) return !1;
		return !0;
	}
	canReplaceWith(e, t, n, r) {
		if (r && !this.type.allowsMarks(r)) return !1;
		let i = this.contentMatchAt(e).matchType(n), a = i && i.matchFragment(this.content, t);
		return a ? a.validEnd : !1;
	}
	canAppend(e) {
		return e.content.size ? this.canReplace(this.childCount, this.childCount, e.content) : this.type.compatibleContent(e.type);
	}
	check() {
		this.type.checkContent(this.content), this.type.checkAttrs(this.attrs);
		let e = l.none;
		for (let t = 0; t < this.marks.length; t++) {
			let n = this.marks[t];
			n.type.checkAttrs(n.attrs), e = n.addToSet(e);
		}
		if (!l.sameSet(e, this.marks)) throw RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((e) => e.type.name)}`);
		this.content.forEach((e) => e.check());
	}
	toJSON() {
		let e = { type: this.type.name };
		for (let t in this.attrs) {
			e.attrs = this.attrs;
			break;
		}
		return this.content.size && (e.content = this.content.toJSON()), this.marks.length && (e.marks = this.marks.map((e) => e.toJSON())), e;
	}
	static fromJSON(e, t) {
		if (!t) throw RangeError("Invalid input for Node.fromJSON");
		let n;
		if (t.marks) {
			if (!Array.isArray(t.marks)) throw RangeError("Invalid mark data for Node.fromJSON");
			n = t.marks.map(e.markFromJSON);
		}
		if (t.type == "text") {
			if (typeof t.text != "string") throw RangeError("Invalid text node in JSON");
			return e.text(t.text, n);
		}
		let r = a.fromJSON(e, t.content), i = e.nodeType(t.type).create(t.attrs, r, n);
		return i.type.checkAttrs(i.attrs), i;
	}
};
le.prototype.text = void 0;
var ue = class e extends le {
	constructor(e, t, n, r) {
		if (super(e, t, null, r), !n) throw RangeError("Empty text nodes are not allowed");
		this.text = n;
	}
	toString() {
		return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : de(this.marks, JSON.stringify(this.text));
	}
	get textContent() {
		return this.text;
	}
	textBetween(e, t) {
		return this.text.slice(e, t);
	}
	get nodeSize() {
		return this.text.length;
	}
	mark(t) {
		return t == this.marks ? this : new e(this.type, this.attrs, this.text, t);
	}
	withText(t) {
		return t == this.text ? this : new e(this.type, this.attrs, t, this.marks);
	}
	cut(e = 0, t = this.text.length) {
		return e == 0 && t == this.text.length ? this : this.withText(this.text.slice(e, t));
	}
	eq(e) {
		return this.sameMarkup(e) && this.text == e.text;
	}
	toJSON() {
		let e = super.toJSON();
		return e.text = this.text, e;
	}
};
function de(e, t) {
	for (let n = e.length - 1; n >= 0; n--) t = e[n].type.name + "(" + t + ")";
	return t;
}
var fe = class e {
	constructor(e) {
		this.validEnd = e, this.next = [], this.wrapCache = [];
	}
	static parse(t, n) {
		let r = new pe(t, n);
		if (r.next == null) return e.empty;
		let i = me(r);
		r.next && r.err("Unexpected trailing text");
		let a = we(xe(i));
		return Te(a, r), a;
	}
	matchType(e) {
		for (let t = 0; t < this.next.length; t++) if (this.next[t].type == e) return this.next[t].next;
		return null;
	}
	matchFragment(e, t = 0, n = e.childCount) {
		let r = this;
		for (let i = t; r && i < n; i++) r = r.matchType(e.child(i).type);
		return r;
	}
	get inlineContent() {
		return this.next.length != 0 && this.next[0].type.isInline;
	}
	get defaultType() {
		for (let e = 0; e < this.next.length; e++) {
			let { type: t } = this.next[e];
			if (!(t.isText || t.hasRequiredAttrs())) return t;
		}
		return null;
	}
	compatible(e) {
		for (let t = 0; t < this.next.length; t++) for (let n = 0; n < e.next.length; n++) if (this.next[t].type == e.next[n].type) return !0;
		return !1;
	}
	fillBefore(e, t = !1, n = 0) {
		let r = [this];
		function i(o, s) {
			let c = o.matchFragment(e, n);
			if (c && (!t || c.validEnd)) return a.from(s.map((e) => e.createAndFill()));
			for (let e = 0; e < o.next.length; e++) {
				let { type: t, next: n } = o.next[e];
				if (!(t.isText || t.hasRequiredAttrs()) && r.indexOf(n) == -1) {
					r.push(n);
					let e = i(n, s.concat(t));
					if (e) return e;
				}
			}
			return null;
		}
		return i(this, []);
	}
	findWrapping(e) {
		for (let t = 0; t < this.wrapCache.length; t += 2) if (this.wrapCache[t] == e) return this.wrapCache[t + 1];
		let t = this.computeWrapping(e);
		return this.wrapCache.push(e, t), t;
	}
	computeWrapping(e) {
		let t = Object.create(null), n = [{
			match: this,
			type: null,
			via: null
		}];
		for (; n.length;) {
			let r = n.shift(), i = r.match;
			if (i.matchType(e)) {
				let e = [];
				for (let t = r; t.type; t = t.via) e.push(t.type);
				return e.reverse();
			}
			for (let e = 0; e < i.next.length; e++) {
				let { type: a, next: o } = i.next[e];
				!a.isLeaf && !a.hasRequiredAttrs() && !(a.name in t) && (!r.type || o.validEnd) && (n.push({
					match: a.contentMatch,
					type: a,
					via: r
				}), t[a.name] = !0);
			}
		}
		return null;
	}
	get edgeCount() {
		return this.next.length;
	}
	edge(e) {
		if (e >= this.next.length) throw RangeError(`There's no ${e}th edge in this content match`);
		return this.next[e];
	}
	toString() {
		let e = [];
		function t(n) {
			e.push(n);
			for (let r = 0; r < n.next.length; r++) e.indexOf(n.next[r].next) == -1 && t(n.next[r].next);
		}
		return t(this), e.map((t, n) => {
			let r = n + (t.validEnd ? "*" : " ") + " ";
			for (let n = 0; n < t.next.length; n++) r += (n ? ", " : "") + t.next[n].type.name + "->" + e.indexOf(t.next[n].next);
			return r;
		}).join("\n");
	}
};
fe.empty = new fe(!0);
var pe = class {
	constructor(e, t) {
		this.string = e, this.nodeTypes = t, this.inline = null, this.pos = 0, this.tokens = e.split(/\s*(?=\b|\W|$)/), this.tokens[this.tokens.length - 1] == "" && this.tokens.pop(), this.tokens[0] == "" && this.tokens.shift();
	}
	get next() {
		return this.tokens[this.pos];
	}
	eat(e) {
		return this.next == e && (this.pos++ || !0);
	}
	err(e) {
		throw SyntaxError(e + " (in content expression '" + this.string + "')");
	}
};
function me(e) {
	let t = [];
	do
		t.push(he(e));
	while (e.eat("|"));
	return t.length == 1 ? t[0] : {
		type: "choice",
		exprs: t
	};
}
function he(e) {
	let t = [];
	do
		t.push(ge(e));
	while (e.next && e.next != ")" && e.next != "|");
	return t.length == 1 ? t[0] : {
		type: "seq",
		exprs: t
	};
}
function ge(e) {
	let t = be(e);
	for (;;) if (e.eat("+")) t = {
		type: "plus",
		expr: t
	};
	else if (e.eat("*")) t = {
		type: "star",
		expr: t
	};
	else if (e.eat("?")) t = {
		type: "opt",
		expr: t
	};
	else if (e.eat("{")) t = ve(e, t);
	else break;
	return t;
}
function _e(e) {
	/\D/.test(e.next) && e.err("Expected number, got '" + e.next + "'");
	let t = Number(e.next);
	return e.pos++, t;
}
function ve(e, t) {
	let n = _e(e), r = n;
	return e.eat(",") && (r = e.next == "}" ? -1 : _e(e)), e.eat("}") || e.err("Unclosed braced range"), {
		type: "range",
		min: n,
		max: r,
		expr: t
	};
}
function ye(e, t) {
	let n = e.nodeTypes, r = n[t];
	if (r) return [r];
	let i = [];
	for (let e in n) {
		let r = n[e];
		r.isInGroup(t) && i.push(r);
	}
	return i.length == 0 && e.err("No node type or group '" + t + "' found"), i;
}
function be(e) {
	if (e.eat("(")) {
		let t = me(e);
		return e.eat(")") || e.err("Missing closing paren"), t;
	}
	if (/\W/.test(e.next)) e.err("Unexpected token '" + e.next + "'");
	else {
		let t = ye(e, e.next).map((t) => (e.inline == null ? e.inline = t.isInline : e.inline != t.isInline && e.err("Mixing inline and block content"), {
			type: "name",
			value: t
		}));
		return e.pos++, t.length == 1 ? t[0] : {
			type: "choice",
			exprs: t
		};
	}
}
function xe(e) {
	let t = [[]];
	return i(a(e, 0), n()), t;
	function n() {
		return t.push([]) - 1;
	}
	function r(e, n, r) {
		let i = {
			term: r,
			to: n
		};
		return t[e].push(i), i;
	}
	function i(e, t) {
		e.forEach((e) => e.to = t);
	}
	function a(e, t) {
		if (e.type == "choice") return e.exprs.reduce((e, n) => e.concat(a(n, t)), []);
		if (e.type == "seq") for (let r = 0;; r++) {
			let o = a(e.exprs[r], t);
			if (r == e.exprs.length - 1) return o;
			i(o, t = n());
		}
		else if (e.type == "star") {
			let o = n();
			return r(t, o), i(a(e.expr, o), o), [r(o)];
		} else if (e.type == "plus") {
			let o = n();
			return i(a(e.expr, t), o), i(a(e.expr, o), o), [r(o)];
		} else if (e.type == "opt") return [r(t)].concat(a(e.expr, t));
		else if (e.type == "range") {
			let o = t;
			for (let t = 0; t < e.min; t++) {
				let t = n();
				i(a(e.expr, o), t), o = t;
			}
			if (e.max == -1) i(a(e.expr, o), o);
			else for (let t = e.min; t < e.max; t++) {
				let t = n();
				r(o, t), i(a(e.expr, o), t), o = t;
			}
			return [r(o)];
		} else if (e.type == "name") return [r(t, void 0, e.value)];
		else throw Error("Unknown expr type");
	}
}
function Se(e, t) {
	return t - e;
}
function Ce(e, t) {
	let n = [];
	return r(t), n.sort(Se);
	function r(t) {
		let i = e[t];
		if (i.length == 1 && !i[0].term) return r(i[0].to);
		n.push(t);
		for (let e = 0; e < i.length; e++) {
			let { term: t, to: a } = i[e];
			!t && n.indexOf(a) == -1 && r(a);
		}
	}
}
function we(e) {
	let t = Object.create(null);
	return n(Ce(e, 0));
	function n(r) {
		let i = [];
		r.forEach((t) => {
			e[t].forEach(({ term: t, to: n }) => {
				if (!t) return;
				let r;
				for (let e = 0; e < i.length; e++) i[e][0] == t && (r = i[e][1]);
				Ce(e, n).forEach((e) => {
					r || i.push([t, r = []]), r.indexOf(e) == -1 && r.push(e);
				});
			});
		});
		let a = t[r.join(",")] = new fe(r.indexOf(e.length - 1) > -1);
		for (let e = 0; e < i.length; e++) {
			let r = i[e][1].sort(Se);
			a.next.push({
				type: i[e][0],
				next: t[r.join(",")] || n(r)
			});
		}
		return a;
	}
}
function Te(e, t) {
	for (let n = 0, r = [e]; n < r.length; n++) {
		let e = r[n], i = !e.validEnd, a = [];
		for (let t = 0; t < e.next.length; t++) {
			let { type: n, next: o } = e.next[t];
			a.push(n.name), i && !(n.isText || n.hasRequiredAttrs()) && (i = !1), r.indexOf(o) == -1 && r.push(o);
		}
		i && t.err("Only non-generatable nodes (" + a.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
	}
}
function Ee(e) {
	let t = Object.create(null);
	for (let n in e) {
		let r = e[n];
		if (!r.hasDefault) return null;
		t[n] = r.default;
	}
	return t;
}
function De(e, t) {
	let n = Object.create(null);
	for (let r in e) {
		let i = t && t[r];
		if (i === void 0) {
			let t = e[r];
			if (t.hasDefault) i = t.default;
			else throw RangeError("No value supplied for attribute " + r);
		}
		n[r] = i;
	}
	return n;
}
function Oe(e, t, n, r) {
	for (let i in t) if (!(i in e)) throw RangeError(`Unsupported attribute ${i} for ${n} of type ${r}`);
	for (let n in e) e[n].validate && e[n].validate(t[n]);
}
function ke(e, t) {
	let n = Object.create(null);
	if (t) for (let r in t) n[r] = new Me(e, r, t[r]);
	return n;
}
var Ae = class e {
	constructor(e, t, n) {
		this.name = e, this.schema = t, this.spec = n, this.markSet = null, this.groups = n.group ? n.group.split(" ") : [], this.attrs = ke(e, n.attrs), this.defaultAttrs = Ee(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(n.inline || e == "text"), this.isText = e == "text";
	}
	get isInline() {
		return !this.isBlock;
	}
	get isTextblock() {
		return this.isBlock && this.inlineContent;
	}
	get isLeaf() {
		return this.contentMatch == fe.empty;
	}
	get isAtom() {
		return this.isLeaf || !!this.spec.atom;
	}
	isInGroup(e) {
		return this.groups.indexOf(e) > -1;
	}
	get whitespace() {
		return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
	}
	hasRequiredAttrs() {
		for (let e in this.attrs) if (this.attrs[e].isRequired) return !0;
		return !1;
	}
	compatibleContent(e) {
		return this == e || this.contentMatch.compatible(e.contentMatch);
	}
	computeAttrs(e) {
		return !e && this.defaultAttrs ? this.defaultAttrs : De(this.attrs, e);
	}
	create(e = null, t, n) {
		if (this.isText) throw Error("NodeType.create can't construct text nodes");
		return new le(this, this.computeAttrs(e), a.from(t), l.setFrom(n));
	}
	createChecked(e = null, t, n) {
		return t = a.from(t), this.checkContent(t), new le(this, this.computeAttrs(e), t, l.setFrom(n));
	}
	createAndFill(e = null, t, n) {
		if (e = this.computeAttrs(e), t = a.from(t), t.size) {
			let e = this.contentMatch.fillBefore(t);
			if (!e) return null;
			t = e.append(t);
		}
		let r = this.contentMatch.matchFragment(t), i = r && r.fillBefore(a.empty, !0);
		return i ? new le(this, e, t.append(i), l.setFrom(n)) : null;
	}
	validContent(e) {
		let t = this.contentMatch.matchFragment(e);
		if (!t || !t.validEnd) return !1;
		for (let t = 0; t < e.childCount; t++) if (!this.allowsMarks(e.child(t).marks)) return !1;
		return !0;
	}
	checkContent(e) {
		if (!this.validContent(e)) throw RangeError(`Invalid content for node ${this.name}: ${e.toString().slice(0, 50)}`);
	}
	checkAttrs(e) {
		Oe(this.attrs, e, "node", this.name);
	}
	allowsMarkType(e) {
		return this.markSet == null || this.markSet.indexOf(e) > -1;
	}
	allowsMarks(e) {
		if (this.markSet == null) return !0;
		for (let t = 0; t < e.length; t++) if (!this.allowsMarkType(e[t].type)) return !1;
		return !0;
	}
	allowedMarks(e) {
		if (this.markSet == null) return e;
		let t;
		for (let n = 0; n < e.length; n++) this.allowsMarkType(e[n].type) ? t && t.push(e[n]) : t || (t = e.slice(0, n));
		return t ? t.length ? t : l.none : e;
	}
	static compile(t, n) {
		let r = Object.create(null);
		t.forEach((t, i) => r[t] = new e(t, n, i));
		let i = n.spec.topNode || "doc";
		if (!r[i]) throw RangeError("Schema is missing its top node type ('" + i + "')");
		if (!r.text) throw RangeError("Every schema needs a 'text' type");
		for (let e in r.text.attrs) throw RangeError("The text node type should not have attributes");
		return r;
	}
};
function je(e, t, n) {
	let r = n.split("|");
	return (n) => {
		let i = n === null ? "null" : typeof n;
		if (r.indexOf(i) < 0) throw RangeError(`Expected value of type ${r} for attribute ${t} on type ${e}, got ${i}`);
	};
}
var Me = class {
	constructor(e, t, n) {
		this.hasDefault = Object.prototype.hasOwnProperty.call(n, "default"), this.default = n.default, this.validate = typeof n.validate == "string" ? je(e, t, n.validate) : n.validate;
	}
	get isRequired() {
		return !this.hasDefault;
	}
}, Ne = class e {
	constructor(e, t, n, r) {
		this.name = e, this.rank = t, this.schema = n, this.spec = r, this.attrs = ke(e, r.attrs), this.excluded = null;
		let i = Ee(this.attrs);
		this.instance = i ? new l(this, i) : null;
	}
	create(e = null) {
		return !e && this.instance ? this.instance : new l(this, De(this.attrs, e));
	}
	static compile(t, n) {
		let r = Object.create(null), i = 0;
		return t.forEach((t, a) => r[t] = new e(t, i++, n, a)), r;
	}
	removeFromSet(e) {
		for (var t = 0; t < e.length; t++) e[t].type == this && (e = e.slice(0, t).concat(e.slice(t + 1)), t--);
		return e;
	}
	isInSet(e) {
		for (let t = 0; t < e.length; t++) if (e[t].type == this) return e[t];
	}
	checkAttrs(e) {
		Oe(this.attrs, e, "mark", this.name);
	}
	excludes(e) {
		return this.excluded.indexOf(e) > -1;
	}
}, Pe = class {
	constructor(t) {
		this.linebreakReplacement = null, this.cached = Object.create(null);
		let n = this.spec = {};
		for (let e in t) n[e] = t[e];
		n.nodes = e.from(t.nodes), n.marks = e.from(t.marks || {}), this.nodes = Ae.compile(this.spec.nodes, this), this.marks = Ne.compile(this.spec.marks, this);
		let r = Object.create(null);
		for (let e in this.nodes) {
			if (e in this.marks) throw RangeError(e + " can not be both a node and a mark");
			let t = this.nodes[e], n = t.spec.content || "", i = t.spec.marks;
			if (t.contentMatch = r[n] || (r[n] = fe.parse(n, this.nodes)), t.inlineContent = t.contentMatch.inlineContent, t.spec.linebreakReplacement) {
				if (this.linebreakReplacement) throw RangeError("Multiple linebreak nodes defined");
				if (!t.isInline || !t.isLeaf) throw RangeError("Linebreak replacement nodes must be inline leaf nodes");
				this.linebreakReplacement = t;
			}
			t.markSet = i == "_" ? null : i ? Fe(this, i.split(" ")) : i == "" || !t.inlineContent ? [] : null;
		}
		for (let e in this.marks) {
			let t = this.marks[e], n = t.spec.excludes;
			t.excluded = n == null ? [t] : n == "" ? [] : Fe(this, n.split(" "));
		}
		this.nodeFromJSON = (e) => le.fromJSON(this, e), this.markFromJSON = (e) => l.fromJSON(this, e), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = Object.create(null);
	}
	node(e, t = null, n, r) {
		if (typeof e == "string") e = this.nodeType(e);
		else if (!(e instanceof Ae)) throw RangeError("Invalid node type: " + e);
		else if (e.schema != this) throw RangeError("Node type from different schema used (" + e.name + ")");
		return e.createChecked(t, n, r);
	}
	text(e, t) {
		let n = this.nodes.text;
		return new ue(n, n.defaultAttrs, e, l.setFrom(t));
	}
	mark(e, t) {
		return typeof e == "string" && (e = this.marks[e]), e.create(t);
	}
	nodeType(e) {
		let t = this.nodes[e];
		if (!t) throw RangeError("Unknown node type: " + e);
		return t;
	}
};
function Fe(e, t) {
	let n = [];
	for (let r = 0; r < t.length; r++) {
		let i = t[r], a = e.marks[i], o = a;
		if (a) n.push(a);
		else for (let t in e.marks) {
			let r = e.marks[t];
			(i == "_" || r.spec.group && r.spec.group.split(" ").indexOf(i) > -1) && n.push(o = r);
		}
		if (!o) throw SyntaxError("Unknown mark type: '" + t[r] + "'");
	}
	return n;
}
function Ie(e) {
	return e.tag != null;
}
function Le(e) {
	return e.style != null;
}
var Re = class e {
	constructor(e, t) {
		this.schema = e, this.rules = t, this.tags = [], this.styles = [];
		let n = this.matchedStyles = [];
		t.forEach((e) => {
			if (Ie(e)) this.tags.push(e);
			else if (Le(e)) {
				let t = /[^=]*/.exec(e.style)[0];
				n.indexOf(t) < 0 && n.push(t), this.styles.push(e);
			}
		}), this.normalizeLists = !this.tags.some((t) => {
			if (!/^(ul|ol)\b/.test(t.tag) || !t.node) return !1;
			let n = e.nodes[t.node];
			return n.contentMatch.matchType(n);
		});
	}
	parse(e, t = {}) {
		let n = new qe(this, t, !1);
		return n.addAll(e, l.none, t.from, t.to), n.finish();
	}
	parseSlice(e, t = {}) {
		let n = new qe(this, t, !0);
		return n.addAll(e, l.none, t.from, t.to), d.maxOpen(n.finish());
	}
	matchTag(e, t, n) {
		for (let r = n ? this.tags.indexOf(n) + 1 : 0; r < this.tags.length; r++) {
			let n = this.tags[r];
			if (Ye(e, n.tag) && (n.namespace === void 0 || e.namespaceURI == n.namespace) && (!n.context || t.matchesContext(n.context))) {
				if (n.getAttrs) {
					let t = n.getAttrs(e);
					if (t === !1) continue;
					n.attrs = t || void 0;
				}
				return n;
			}
		}
	}
	matchStyle(e, t, n, r) {
		for (let i = r ? this.styles.indexOf(r) + 1 : 0; i < this.styles.length; i++) {
			let r = this.styles[i], a = r.style;
			if (!(a.indexOf(e) != 0 || r.context && !n.matchesContext(r.context) || a.length > e.length && (a.charCodeAt(e.length) != 61 || a.slice(e.length + 1) != t))) {
				if (r.getAttrs) {
					let e = r.getAttrs(t);
					if (e === !1) continue;
					r.attrs = e || void 0;
				}
				return r;
			}
		}
	}
	static schemaRules(e) {
		let t = [];
		function n(e) {
			let n = e.priority == null ? 50 : e.priority, r = 0;
			for (; r < t.length; r++) {
				let e = t[r];
				if ((e.priority == null ? 50 : e.priority) < n) break;
			}
			t.splice(r, 0, e);
		}
		for (let t in e.marks) {
			let r = e.marks[t].spec.parseDOM;
			r && r.forEach((e) => {
				n(e = Xe(e)), e.mark || e.ignore || e.clearMark || (e.mark = t);
			});
		}
		for (let t in e.nodes) {
			let r = e.nodes[t].spec.parseDOM;
			r && r.forEach((e) => {
				n(e = Xe(e)), e.node || e.ignore || e.mark || (e.node = t);
			});
		}
		return t;
	}
	static fromSchema(t) {
		return t.cached.domParser || (t.cached.domParser = new e(t, e.schemaRules(t)));
	}
}, ze = {
	address: !0,
	article: !0,
	aside: !0,
	blockquote: !0,
	body: !0,
	canvas: !0,
	dd: !0,
	div: !0,
	dl: !0,
	fieldset: !0,
	figcaption: !0,
	figure: !0,
	footer: !0,
	form: !0,
	h1: !0,
	h2: !0,
	h3: !0,
	h4: !0,
	h5: !0,
	h6: !0,
	header: !0,
	hgroup: !0,
	hr: !0,
	li: !0,
	noscript: !0,
	ol: !0,
	output: !0,
	p: !0,
	pre: !0,
	section: !0,
	table: !0,
	tfoot: !0,
	ul: !0
}, Be = {
	head: !0,
	noscript: !0,
	object: !0,
	script: !0,
	style: !0,
	title: !0
}, Ve = {
	ol: !0,
	ul: !0
}, He = 1, Ue = 2, We = 4;
function Ge(e, t, n) {
	return t == null ? e && e.whitespace == "pre" ? 3 : n & -5 : (t ? He : 0) | (t === "full" ? Ue : 0);
}
var Ke = class {
	constructor(e, t, n, r, i, a) {
		this.type = e, this.attrs = t, this.marks = n, this.solid = r, this.options = a, this.content = [], this.activeMarks = l.none, this.match = i || (a & We ? null : e.contentMatch);
	}
	findWrapping(e) {
		if (!this.match) {
			if (!this.type) return [];
			let t = this.type.contentMatch.fillBefore(a.from(e));
			if (t) this.match = this.type.contentMatch.matchFragment(t);
			else {
				let t = this.type.contentMatch, n;
				return (n = t.findWrapping(e.type)) ? (this.match = t, n) : null;
			}
		}
		return this.match.findWrapping(e.type);
	}
	finish(e) {
		if (!(this.options & He)) {
			let e = this.content[this.content.length - 1], t;
			if (e && e.isText && (t = /[ \t\r\n\u000c]+$/.exec(e.text))) {
				let n = e;
				e.text.length == t[0].length ? this.content.pop() : this.content[this.content.length - 1] = n.withText(n.text.slice(0, n.text.length - t[0].length));
			}
		}
		let t = a.from(this.content);
		return !e && this.match && (t = t.append(this.match.fillBefore(a.empty, !0))), this.type ? this.type.create(this.attrs, t, this.marks) : t;
	}
	inlineContext(e) {
		return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !ze.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
	}
}, qe = class {
	constructor(e, t, n) {
		this.parser = e, this.options = t, this.isOpen = n, this.open = 0, this.localPreserveWS = !1;
		let r = t.topNode, i, a = Ge(null, t.preserveWhitespace, 0) | (n ? We : 0);
		i = r ? new Ke(r.type, r.attrs, l.none, !0, t.topMatch || r.type.contentMatch, a) : n ? new Ke(null, null, l.none, !0, null, a) : new Ke(e.schema.topNodeType, null, l.none, !0, null, a), this.nodes = [i], this.find = t.findPositions, this.needsBlock = !1;
	}
	get top() {
		return this.nodes[this.open];
	}
	addDOM(e, t) {
		e.nodeType == 3 ? this.addTextNode(e, t) : e.nodeType == 1 && this.addElement(e, t);
	}
	addTextNode(e, t) {
		let n = e.nodeValue, r = this.top, i = r.options & Ue ? "full" : this.localPreserveWS || (r.options & He) > 0, { schema: a } = this.parser;
		if (i === "full" || r.inlineContext(e) || /[^ \t\r\n\u000c]/.test(n)) {
			if (!i) {
				if (n = n.replace(/[ \t\r\n\u000c]+/g, " "), /^[ \t\r\n\u000c]/.test(n) && this.open == this.nodes.length - 1) {
					let t = r.content[r.content.length - 1], i = e.previousSibling;
					(!t || i && i.nodeName == "BR" || t.isText && /[ \t\r\n\u000c]$/.test(t.text)) && (n = n.slice(1));
				}
			} else if (i === "full") n = n.replace(/\r\n?/g, "\n");
			else if (a.linebreakReplacement && /[\r\n]/.test(n) && this.top.findWrapping(a.linebreakReplacement.create())) {
				let e = n.split(/\r?\n|\r/);
				for (let n = 0; n < e.length; n++) n && this.insertNode(a.linebreakReplacement.create(), t, !0), e[n] && this.insertNode(a.text(e[n]), t, !/\S/.test(e[n]));
				n = "";
			} else n = n.replace(/\r?\n|\r/g, " ");
			n && this.insertNode(a.text(n), t, !/\S/.test(n)), this.findInText(e);
		} else this.findInside(e);
	}
	addElement(e, t, n) {
		let r = this.localPreserveWS, i = this.top;
		(e.tagName == "PRE" || /pre/.test(e.style && e.style.whiteSpace)) && (this.localPreserveWS = !0);
		let a = e.nodeName.toLowerCase(), o;
		Ve.hasOwnProperty(a) && this.parser.normalizeLists && Je(e);
		let s = this.options.ruleFromNode && this.options.ruleFromNode(e) || (o = this.parser.matchTag(e, this, n));
		out: if (s ? s.ignore : Be.hasOwnProperty(a)) this.findInside(e), this.ignoreFallback(e, t);
		else if (!s || s.skip || s.closeParent) {
			s && s.closeParent ? this.open = Math.max(0, this.open - 1) : s && s.skip.nodeType && (e = s.skip);
			let n, r = this.needsBlock;
			if (ze.hasOwnProperty(a)) i.content.length && i.content[0].isInline && this.open && (this.open--, i = this.top), n = !0, i.type || (this.needsBlock = !0);
			else if (!e.firstChild) {
				this.leafFallback(e, t);
				break out;
			}
			let o = s && s.skip ? t : this.readStyles(e, t);
			o && this.addAll(e, o), n && this.sync(i), this.needsBlock = r;
		} else {
			let n = this.readStyles(e, t);
			n && this.addElementByRule(e, s, n, s.consuming === !1 ? o : void 0);
		}
		this.localPreserveWS = r;
	}
	leafFallback(e, t) {
		e.nodeName == "BR" && this.top.type && this.top.type.inlineContent && this.addTextNode(e.ownerDocument.createTextNode("\n"), t);
	}
	ignoreFallback(e, t) {
		e.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent) && this.findPlace(this.parser.schema.text("-"), t, !0);
	}
	readStyles(e, t) {
		let n = e.style;
		if (n && n.length) for (let e = 0; e < this.parser.matchedStyles.length; e++) {
			let r = this.parser.matchedStyles[e], i = n.getPropertyValue(r);
			if (i) for (let e;;) {
				let n = this.parser.matchStyle(r, i, this, e);
				if (!n) break;
				if (n.ignore) return null;
				if (t = n.clearMark ? t.filter((e) => !n.clearMark(e)) : t.concat(this.parser.schema.marks[n.mark].create(n.attrs)), n.consuming === !1) e = n;
				else break;
			}
		}
		return t;
	}
	addElementByRule(e, t, n, r) {
		let i, a;
		if (t.node) {
			if (a = this.parser.schema.nodes[t.node], a.isLeaf) this.insertNode(a.create(t.attrs), n, e.nodeName == "BR") || this.leafFallback(e, n);
			else {
				let e = this.enter(a, t.attrs || null, n, t.preserveWhitespace);
				e && (i = !0, n = e);
			}
		} else {
			let e = this.parser.schema.marks[t.mark];
			n = n.concat(e.create(t.attrs));
		}
		let o = this.top;
		if (a && a.isLeaf) this.findInside(e);
		else if (r) this.addElement(e, n, r);
		else if (t.getContent) this.findInside(e), t.getContent(e, this.parser.schema).forEach((e) => this.insertNode(e, n, !1));
		else {
			let r = e;
			typeof t.contentElement == "string" ? r = e.querySelector(t.contentElement) : typeof t.contentElement == "function" ? r = t.contentElement(e) : t.contentElement && (r = t.contentElement), this.findAround(e, r, !0), this.addAll(r, n), this.findAround(e, r, !1);
		}
		i && this.sync(o) && this.open--;
	}
	addAll(e, t, n, r) {
		let i = n || 0;
		for (let a = n ? e.childNodes[n] : e.firstChild, o = r == null ? null : e.childNodes[r]; a != o; a = a.nextSibling, ++i) this.findAtPoint(e, i), this.addDOM(a, t);
		this.findAtPoint(e, i);
	}
	findPlace(e, t, n) {
		let r, i;
		for (let t = this.open, a = 0; t >= 0; t--) {
			let o = this.nodes[t], s = o.findWrapping(e);
			if (s && (!r || r.length > s.length + a) && (r = s, i = o, !s.length)) break;
			if (o.solid) {
				if (n) break;
				a += 2;
			}
		}
		if (!r) return null;
		this.sync(i);
		for (let e = 0; e < r.length; e++) t = this.enterInner(r[e], null, t, !1);
		return t;
	}
	insertNode(e, t, n) {
		if (e.isInline && this.needsBlock && !this.top.type) {
			let e = this.textblockFromContext();
			e && (t = this.enterInner(e, null, t));
		}
		let r = this.findPlace(e, t, n);
		if (r) {
			this.closeExtra();
			let t = this.top;
			t.match && (t.match = t.match.matchType(e.type));
			let n = l.none;
			for (let i of r.concat(e.marks)) (t.type ? t.type.allowsMarkType(i.type) : Ze(i.type, e.type)) && (n = i.addToSet(n));
			return t.content.push(e.mark(n)), !0;
		}
		return !1;
	}
	enter(e, t, n, r) {
		let i = this.findPlace(e.create(t), n, !1);
		return i && (i = this.enterInner(e, t, n, !0, r)), i;
	}
	enterInner(e, t, n, r = !1, i) {
		this.closeExtra();
		let a = this.top;
		a.match = a.match && a.match.matchType(e);
		let o = Ge(e, i, a.options);
		a.options & We && a.content.length == 0 && (o |= We);
		let s = l.none;
		return n = n.filter((t) => !(a.type ? a.type.allowsMarkType(t.type) : Ze(t.type, e)) || (s = t.addToSet(s), !1)), this.nodes.push(new Ke(e, t, s, r, null, o)), this.open++, n;
	}
	closeExtra(e = !1) {
		let t = this.nodes.length - 1;
		if (t > this.open) {
			for (; t > this.open; t--) this.nodes[t - 1].content.push(this.nodes[t].finish(e));
			this.nodes.length = this.open + 1;
		}
	}
	finish() {
		return this.open = 0, this.closeExtra(this.isOpen), this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
	}
	sync(e) {
		for (let t = this.open; t >= 0; t--) if (this.nodes[t] == e) return this.open = t, !0;
		else this.localPreserveWS && (this.nodes[t].options |= He);
		return !1;
	}
	get currentPos() {
		this.closeExtra();
		let e = 0;
		for (let t = this.open; t >= 0; t--) {
			let n = this.nodes[t].content;
			for (let t = n.length - 1; t >= 0; t--) e += n[t].nodeSize;
			t && e++;
		}
		return e;
	}
	findAtPoint(e, t) {
		if (this.find) for (let n = 0; n < this.find.length; n++) this.find[n].node == e && this.find[n].offset == t && (this.find[n].pos = this.currentPos);
	}
	findInside(e) {
		if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].pos == null && e.nodeType == 1 && e.contains(this.find[t].node) && (this.find[t].pos = this.currentPos);
	}
	findAround(e, t, n) {
		if (e != t && this.find) for (let r = 0; r < this.find.length; r++) this.find[r].pos == null && e.nodeType == 1 && e.contains(this.find[r].node) && t.compareDocumentPosition(this.find[r].node) & (n ? 2 : 4) && (this.find[r].pos = this.currentPos);
	}
	findInText(e) {
		if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].node == e && (this.find[t].pos = this.currentPos - (e.nodeValue.length - this.find[t].offset));
	}
	matchesContext(e) {
		if (e.indexOf("|") > -1) return e.split(/\s*\|\s*/).some(this.matchesContext, this);
		let t = e.split("/"), n = this.options.context, r = !this.isOpen && (!n || n.parent.type == this.nodes[0].type), i = -(n ? n.depth + 1 : 0) + +!r, a = (e, o) => {
			for (; e >= 0; e--) {
				let s = t[e];
				if (s == "") {
					if (e == t.length - 1 || e == 0) continue;
					for (; o >= i; o--) if (a(e - 1, o)) return !0;
					return !1;
				}
				{
					let e = o > 0 || o == 0 && r ? this.nodes[o].type : n && o >= i ? n.node(o - i).type : null;
					if (!e || e.name != s && !e.isInGroup(s)) return !1;
					o--;
				}
			}
			return !0;
		};
		return a(t.length - 1, this.open);
	}
	textblockFromContext() {
		let e = this.options.context;
		if (e) for (let t = e.depth; t >= 0; t--) {
			let n = e.node(t).contentMatchAt(e.indexAfter(t)).defaultType;
			if (n && n.isTextblock && n.defaultAttrs) return n;
		}
		for (let e in this.parser.schema.nodes) {
			let t = this.parser.schema.nodes[e];
			if (t.isTextblock && t.defaultAttrs) return t;
		}
	}
};
function Je(e) {
	for (let t = e.firstChild, n = null; t; t = t.nextSibling) {
		let e = t.nodeType == 1 ? t.nodeName.toLowerCase() : null;
		e && Ve.hasOwnProperty(e) && n ? (n.appendChild(t), t = n) : e == "li" ? n = t : e && (n = null);
	}
}
function Ye(e, t) {
	return (e.matches || e.msMatchesSelector || e.webkitMatchesSelector || e.mozMatchesSelector).call(e, t);
}
function Xe(e) {
	let t = {};
	for (let n in e) t[n] = e[n];
	return t;
}
function Ze(e, t) {
	let n = t.schema.nodes;
	for (let r in n) {
		let i = n[r];
		if (!i.allowsMarkType(e)) continue;
		let a = [], o = (e) => {
			a.push(e);
			for (let n = 0; n < e.edgeCount; n++) {
				let { type: r, next: i } = e.edge(n);
				if (r == t || a.indexOf(i) < 0 && o(i)) return !0;
			}
		};
		if (o(i.contentMatch)) return !0;
	}
}
var Qe = class e {
	constructor(e, t) {
		this.nodes = e, this.marks = t;
	}
	serializeFragment(e, t = {}, n) {
		n || (n = et(t).createDocumentFragment());
		let r = n, i = [];
		return e.forEach((e) => {
			if (i.length || e.marks.length) {
				let n = 0, a = 0;
				for (; n < i.length && a < e.marks.length;) {
					let t = e.marks[a];
					if (!this.marks[t.type.name]) {
						a++;
						continue;
					}
					if (!t.eq(i[n][0]) || t.type.spec.spanning === !1) break;
					n++, a++;
				}
				for (; n < i.length;) r = i.pop()[1];
				for (; a < e.marks.length;) {
					let n = e.marks[a++], o = this.serializeMark(n, e.isInline, t);
					o && (i.push([n, r]), r.appendChild(o.dom), r = o.contentDOM || o.dom);
				}
			}
			r.appendChild(this.serializeNodeInner(e, t));
		}), n;
	}
	serializeNodeInner(e, t) {
		if (e.isText) return et(t).createTextNode(e.text);
		let { dom: n, contentDOM: r } = it(et(t), this.nodes[e.type.name](e), null, e.attrs);
		if (r) {
			if (e.isLeaf) throw RangeError("Content hole not allowed in a leaf node spec");
			this.serializeFragment(e.content, t, r);
		}
		return n;
	}
	serializeNode(e, t = {}) {
		let n = this.serializeNodeInner(e, t);
		for (let r = e.marks.length - 1; r >= 0; r--) {
			let i = this.serializeMark(e.marks[r], e.isInline, t);
			i && ((i.contentDOM || i.dom).appendChild(n), n = i.dom);
		}
		return n;
	}
	serializeMark(e, t, n = {}) {
		let r = this.marks[e.type.name];
		return r && it(et(n), r(e, t), null, e.attrs);
	}
	static renderSpec(e, t, n = null, r) {
		return typeof t == "string" ? { dom: e.createTextNode(t) } : it(e, t, n, r);
	}
	static fromSchema(t) {
		return t.cached.domSerializer || (t.cached.domSerializer = new e(this.nodesFromSchema(t), this.marksFromSchema(t)));
	}
	static nodesFromSchema(e) {
		let t = $e(e.nodes);
		return t.text || (t.text = (e) => e.text), t;
	}
	static marksFromSchema(e) {
		return $e(e.marks);
	}
};
function $e(e) {
	let t = {};
	for (let n in e) {
		let r = e[n].spec.toDOM;
		r && (t[n] = r);
	}
	return t;
}
function et(e) {
	return e.document || window.document;
}
var tt = /* @__PURE__ */ new WeakMap();
function nt(e) {
	let t = tt.get(e);
	return t === void 0 && tt.set(e, t = rt(e)), t;
}
function rt(e) {
	let t = null;
	function n(e) {
		if (e && typeof e == "object") {
			if (Array.isArray(e)) {
				if (typeof e[0] == "string") t || (t = []), t.push(e);
				else for (let t = 0; t < e.length; t++) n(e[t]);
			} else for (let t in e) n(e[t]);
		}
	}
	return n(e), t;
}
function it(e, t, n, r) {
	if (t.nodeType == 1) return { dom: t };
	if (t.dom && t.dom.nodeType == 1) return t;
	let i = t[0], a;
	if (typeof i != "string") throw RangeError("Invalid array passed to renderSpec");
	if (r && (a = nt(r)) && a.indexOf(t) > -1) throw RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
	let o = i.indexOf(" ");
	o > 0 && (n = i.slice(0, o), i = i.slice(o + 1));
	let s, c = n ? e.createElementNS(n, i) : e.createElement(i), l = t[1], u = 1;
	if (l && typeof l == "object" && l.nodeType == null && !Array.isArray(l)) {
		u = 2;
		for (let e in l) if (l[e] != null) {
			let t = e.indexOf(" ");
			t > 0 ? c.setAttributeNS(e.slice(0, t), e.slice(t + 1), l[e]) : e == "style" && c.style ? c.style.cssText = l[e] : c.setAttribute(e, l[e]);
		}
	}
	for (let i = u; i < t.length; i++) {
		let a = t[i];
		if (a === 0) {
			if (i < t.length - 1 || i > u) throw RangeError("Content hole must be the only child of its parent node");
			return {
				dom: c,
				contentDOM: c
			};
		}
		if (typeof a == "string") c.appendChild(e.createTextNode(a));
		else {
			let { dom: t, contentDOM: i } = it(e, a, n, r);
			if (c.appendChild(t), i) {
				if (s) throw RangeError("Multiple content holes");
				s = i;
			}
		}
	}
	return {
		dom: c,
		contentDOM: s
	};
}
//#endregion
//#region node_modules/prosemirror-transform/dist/index.js
var at = 65535, ot = 2 ** 16;
function st(e, t) {
	return e + t * ot;
}
function ct(e) {
	return e & at;
}
function lt(e) {
	return (e - (e & at)) / ot;
}
var ut = 1, dt = 2, ft = 4, pt = 8, mt = class {
	constructor(e, t, n) {
		this.pos = e, this.delInfo = t, this.recover = n;
	}
	get deleted() {
		return (this.delInfo & pt) > 0;
	}
	get deletedBefore() {
		return (this.delInfo & 5) > 0;
	}
	get deletedAfter() {
		return (this.delInfo & 6) > 0;
	}
	get deletedAcross() {
		return (this.delInfo & ft) > 0;
	}
}, ht = class e {
	constructor(t, n = !1) {
		if (this.ranges = t, this.inverted = n, !t.length && e.empty) return e.empty;
	}
	recover(e) {
		let t = 0, n = ct(e);
		if (!this.inverted) for (let e = 0; e < n; e++) t += this.ranges[e * 3 + 2] - this.ranges[e * 3 + 1];
		return this.ranges[n * 3] + t + lt(e);
	}
	mapResult(e, t = 1) {
		return this._map(e, t, !1);
	}
	map(e, t = 1) {
		return this._map(e, t, !0);
	}
	_map(e, t, n) {
		let r = 0, i = this.inverted ? 2 : 1, a = this.inverted ? 1 : 2;
		for (let o = 0; o < this.ranges.length; o += 3) {
			let s = this.ranges[o] - (this.inverted ? r : 0);
			if (s > e) break;
			let c = this.ranges[o + i], l = this.ranges[o + a], u = s + c;
			if (e <= u) {
				let i = c ? e == s ? -1 : e == u ? 1 : t : t, a = s + r + (i < 0 ? 0 : l);
				if (n) return a;
				let d = e == (t < 0 ? s : u) ? null : st(o / 3, e - s), f = e == s ? dt : e == u ? ut : ft;
				return (t < 0 ? e != s : e != u) && (f |= pt), new mt(a, f, d);
			}
			r += l - c;
		}
		return n ? e + r : new mt(e + r, 0, null);
	}
	touches(e, t) {
		let n = 0, r = ct(t), i = this.inverted ? 2 : 1, a = this.inverted ? 1 : 2;
		for (let t = 0; t < this.ranges.length; t += 3) {
			let o = this.ranges[t] - (this.inverted ? n : 0);
			if (o > e) break;
			let s = this.ranges[t + i];
			if (e <= o + s && t == r * 3) return !0;
			n += this.ranges[t + a] - s;
		}
		return !1;
	}
	forEach(e) {
		let t = this.inverted ? 2 : 1, n = this.inverted ? 1 : 2;
		for (let r = 0, i = 0; r < this.ranges.length; r += 3) {
			let a = this.ranges[r], o = a - (this.inverted ? i : 0), s = a + (this.inverted ? 0 : i), c = this.ranges[r + t], l = this.ranges[r + n];
			e(o, o + c, s, s + l), i += l - c;
		}
	}
	invert() {
		return new e(this.ranges, !this.inverted);
	}
	toString() {
		return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
	}
	static offset(t) {
		return t == 0 ? e.empty : new e(t < 0 ? [
			0,
			-t,
			0
		] : [
			0,
			0,
			t
		]);
	}
};
ht.empty = new ht([]);
var gt = class e {
	constructor(e, t, n = 0, r = e ? e.length : 0) {
		this.mirror = t, this.from = n, this.to = r, this._maps = e || [], this.ownData = !(e || t);
	}
	get maps() {
		return this._maps;
	}
	slice(t = 0, n = this.maps.length) {
		return new e(this._maps, this.mirror, t, n);
	}
	appendMap(e, t) {
		this.ownData || (this._maps = this._maps.slice(), this.mirror = this.mirror && this.mirror.slice(), this.ownData = !0), this.to = this._maps.push(e), t != null && this.setMirror(this._maps.length - 1, t);
	}
	appendMapping(e) {
		for (let t = 0, n = this._maps.length; t < e._maps.length; t++) {
			let r = e.getMirror(t);
			this.appendMap(e._maps[t], r != null && r < t ? n + r : void 0);
		}
	}
	getMirror(e) {
		if (this.mirror) {
			for (let t = 0; t < this.mirror.length; t++) if (this.mirror[t] == e) return this.mirror[t + (t % 2 ? -1 : 1)];
		}
	}
	setMirror(e, t) {
		this.mirror || (this.mirror = []), this.mirror.push(e, t);
	}
	appendMappingInverted(e) {
		for (let t = e.maps.length - 1, n = this._maps.length + e._maps.length; t >= 0; t--) {
			let r = e.getMirror(t);
			this.appendMap(e._maps[t].invert(), r != null && r > t ? n - r - 1 : void 0);
		}
	}
	invert() {
		let t = new e();
		return t.appendMappingInverted(this), t;
	}
	map(e, t = 1) {
		if (this.mirror) return this._map(e, t, !0);
		for (let n = this.from; n < this.to; n++) e = this._maps[n].map(e, t);
		return e;
	}
	mapResult(e, t = 1) {
		return this._map(e, t, !1);
	}
	_map(e, t, n) {
		let r = 0;
		for (let n = this.from; n < this.to; n++) {
			let i = this._maps[n].mapResult(e, t);
			if (i.recover != null) {
				let t = this.getMirror(n);
				if (t != null && t > n && t < this.to) {
					n = t, e = this._maps[t].recover(i.recover);
					continue;
				}
			}
			r |= i.delInfo, e = i.pos;
		}
		return n ? e : new mt(e, r, null);
	}
}, _t = Object.create(null), x = class {
	getMap() {
		return ht.empty;
	}
	merge(e) {
		return null;
	}
	static fromJSON(e, t) {
		if (!t || !t.stepType) throw RangeError("Invalid input for Step.fromJSON");
		let n = _t[t.stepType];
		if (!n) throw RangeError(`No step type ${t.stepType} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in _t) throw RangeError("Duplicate use of step JSON ID " + e);
		return _t[e] = t, t.prototype.jsonID = e, t;
	}
}, S = class e {
	constructor(e, t) {
		this.doc = e, this.failed = t;
	}
	static ok(t) {
		return new e(t, null);
	}
	static fail(t) {
		return new e(null, t);
	}
	static fromReplace(t, n, r, i) {
		try {
			return e.ok(t.replace(n, r, i));
		} catch (t) {
			if (t instanceof u) return e.fail(t.message);
			throw t;
		}
	}
};
function vt(e, t, n) {
	let r = [];
	for (let i = 0; i < e.childCount; i++) {
		let a = e.child(i);
		a.content.size && (a = a.copy(vt(a.content, t, a))), a.isInline && (a = t(a, n, i)), r.push(a);
	}
	return a.fromArray(r);
}
var yt = class e extends x {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = e.resolve(this.from), r = n.node(n.sharedDepth(this.to)), i = new d(vt(t.content, (e, t) => !e.isAtom || !t.type.allowsMarkType(this.mark.type) ? e : e.mark(this.mark.addToSet(e.marks)), r), t.openStart, t.openEnd);
		return S.fromReplace(e, this.from, this.to, i);
	}
	invert() {
		return new bt(this.from, this.to, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1);
		return n.deleted && r.deleted || n.pos >= r.pos ? null : new e(n.pos, r.pos, this.mark);
	}
	merge(t) {
		return t instanceof e && t.mark.eq(this.mark) && this.from <= t.to && this.to >= t.from ? new e(Math.min(this.from, t.from), Math.max(this.to, t.to), this.mark) : null;
	}
	toJSON() {
		return {
			stepType: "addMark",
			mark: this.mark.toJSON(),
			from: this.from,
			to: this.to
		};
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for AddMarkStep.fromJSON");
		return new e(n.from, n.to, t.markFromJSON(n.mark));
	}
};
x.jsonID("addMark", yt);
var bt = class e extends x {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = new d(vt(t.content, (e) => e.mark(this.mark.removeFromSet(e.marks)), e), t.openStart, t.openEnd);
		return S.fromReplace(e, this.from, this.to, n);
	}
	invert() {
		return new yt(this.from, this.to, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1);
		return n.deleted && r.deleted || n.pos >= r.pos ? null : new e(n.pos, r.pos, this.mark);
	}
	merge(t) {
		return t instanceof e && t.mark.eq(this.mark) && this.from <= t.to && this.to >= t.from ? new e(Math.min(this.from, t.from), Math.max(this.to, t.to), this.mark) : null;
	}
	toJSON() {
		return {
			stepType: "removeMark",
			mark: this.mark.toJSON(),
			from: this.from,
			to: this.to
		};
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for RemoveMarkStep.fromJSON");
		return new e(n.from, n.to, t.markFromJSON(n.mark));
	}
};
x.jsonID("removeMark", bt);
var xt = class e extends x {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return S.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.addToSet(t.marks));
		return S.fromReplace(e, this.pos, this.pos + 1, new d(a.from(n), 0, +!t.isLeaf));
	}
	invert(t) {
		let n = t.nodeAt(this.pos);
		if (n) {
			let t = this.mark.addToSet(n.marks);
			if (t.length == n.marks.length) {
				for (let r = 0; r < n.marks.length; r++) if (!n.marks[r].isInSet(t)) return new e(this.pos, n.marks[r]);
				return new e(this.pos, this.mark);
			}
		}
		return new St(this.pos, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.mark);
	}
	toJSON() {
		return {
			stepType: "addNodeMark",
			pos: this.pos,
			mark: this.mark.toJSON()
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for AddNodeMarkStep.fromJSON");
		return new e(n.pos, t.markFromJSON(n.mark));
	}
};
x.jsonID("addNodeMark", xt);
var St = class e extends x {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return S.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.removeFromSet(t.marks));
		return S.fromReplace(e, this.pos, this.pos + 1, new d(a.from(n), 0, +!t.isLeaf));
	}
	invert(e) {
		let t = e.nodeAt(this.pos);
		return !t || !this.mark.isInSet(t.marks) ? this : new xt(this.pos, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.mark);
	}
	toJSON() {
		return {
			stepType: "removeNodeMark",
			pos: this.pos,
			mark: this.mark.toJSON()
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
		return new e(n.pos, t.markFromJSON(n.mark));
	}
};
x.jsonID("removeNodeMark", St);
var Ct = class e extends x {
	constructor(e, t, n, r = !1) {
		super(), this.from = e, this.to = t, this.slice = n, this.structure = r;
	}
	apply(e) {
		return this.structure && wt(e, this.from, this.to) ? S.fail("Structure replace would overwrite content") : S.fromReplace(e, this.from, this.to, this.slice);
	}
	getMap() {
		return new ht([
			this.from,
			this.to - this.from,
			this.slice.size
		]);
	}
	invert(t) {
		return new e(this.from, this.from + this.slice.size, t.slice(this.from, this.to));
	}
	map(t) {
		let n = t.mapResult(this.to, -1), r = this.from == this.to && e.MAP_BIAS < 0 ? n : t.mapResult(this.from, 1);
		return r.deletedAcross && n.deletedAcross ? null : new e(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
	}
	merge(t) {
		if (!(t instanceof e) || t.structure || this.structure) return null;
		if (this.from + this.slice.size == t.from && !this.slice.openEnd && !t.slice.openStart) {
			let n = this.slice.size + t.slice.size == 0 ? d.empty : new d(this.slice.content.append(t.slice.content), this.slice.openStart, t.slice.openEnd);
			return new e(this.from, this.to + (t.to - t.from), n, this.structure);
		}
		if (t.to == this.from && !this.slice.openStart && !t.slice.openEnd) {
			let n = this.slice.size + t.slice.size == 0 ? d.empty : new d(t.slice.content.append(this.slice.content), t.slice.openStart, this.slice.openEnd);
			return new e(t.from, this.to, n, this.structure);
		}
		return null;
	}
	toJSON() {
		let e = {
			stepType: "replace",
			from: this.from,
			to: this.to
		};
		return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for ReplaceStep.fromJSON");
		return new e(n.from, n.to, d.fromJSON(t, n.slice), !!n.structure);
	}
};
Ct.MAP_BIAS = 1, x.jsonID("replace", Ct);
var C = class e extends x {
	constructor(e, t, n, r, i, a, o = !1) {
		super(), this.from = e, this.to = t, this.gapFrom = n, this.gapTo = r, this.slice = i, this.insert = a, this.structure = o;
	}
	apply(e) {
		if (this.structure && (wt(e, this.from, this.gapFrom) || wt(e, this.gapTo, this.to))) return S.fail("Structure gap-replace would overwrite content");
		let t = e.slice(this.gapFrom, this.gapTo);
		if (t.openStart || t.openEnd) return S.fail("Gap is not a flat range");
		let n = this.slice.insertAt(this.insert, t.content);
		return n ? S.fromReplace(e, this.from, this.to, n) : S.fail("Content does not fit in gap");
	}
	getMap() {
		return new ht([
			this.from,
			this.gapFrom - this.from,
			this.insert,
			this.gapTo,
			this.to - this.gapTo,
			this.slice.size - this.insert
		]);
	}
	invert(t) {
		let n = this.gapTo - this.gapFrom;
		return new e(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, t.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : t.map(this.gapFrom, -1), a = this.to == this.gapTo ? r.pos : t.map(this.gapTo, 1);
		return n.deletedAcross && r.deletedAcross || i < n.pos || a > r.pos ? null : new e(n.pos, r.pos, i, a, this.slice, this.insert, this.structure);
	}
	toJSON() {
		let e = {
			stepType: "replaceAround",
			from: this.from,
			to: this.to,
			gapFrom: this.gapFrom,
			gapTo: this.gapTo,
			insert: this.insert
		};
		return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number" || typeof n.gapFrom != "number" || typeof n.gapTo != "number" || typeof n.insert != "number") throw RangeError("Invalid input for ReplaceAroundStep.fromJSON");
		return new e(n.from, n.to, n.gapFrom, n.gapTo, d.fromJSON(t, n.slice), n.insert, !!n.structure);
	}
};
x.jsonID("replaceAround", C);
function wt(e, t, n) {
	let r = e.resolve(t), i = n - t, a = r.depth;
	for (; i > 0 && a > 0 && r.indexAfter(a) == r.node(a).childCount;) a--, i--;
	if (i > 0) {
		let e = r.node(a).maybeChild(r.indexAfter(a));
		for (; i > 0;) {
			if (!e || e.isLeaf) return !0;
			e = e.firstChild, i--;
		}
	}
	return !1;
}
function Tt(e, t, n, r) {
	let i = [], a = [], o, s;
	e.doc.nodesBetween(t, n, (e, c, l) => {
		if (!e.isInline) return;
		let u = e.marks;
		if (!r.isInSet(u) && l.type.allowsMarkType(r.type)) {
			let l = Math.max(c, t), d = Math.min(c + e.nodeSize, n), f = r.addToSet(u);
			for (let e = 0; e < u.length; e++) u[e].isInSet(f) || (o && o.to == l && o.mark.eq(u[e]) ? o.to = d : i.push(o = new bt(l, d, u[e])));
			s && s.to == l ? s.to = d : a.push(s = new yt(l, d, r));
		}
	}), i.forEach((t) => e.step(t)), a.forEach((t) => e.step(t));
}
function Et(e, t, n, r) {
	let i = [], a = 0;
	e.doc.nodesBetween(t, n, (e, o) => {
		if (!e.isInline) return;
		a++;
		let s = null;
		if (r instanceof Ne) {
			let t = e.marks, n;
			for (; n = r.isInSet(t);) (s || (s = [])).push(n), t = n.removeFromSet(t);
		} else r ? r.isInSet(e.marks) && (s = [r]) : s = e.marks;
		if (s && s.length) {
			let r = Math.min(o + e.nodeSize, n);
			for (let e = 0; e < s.length; e++) {
				let n = s[e], c;
				for (let e = 0; e < i.length; e++) {
					let t = i[e];
					t.step == a - 1 && n.eq(i[e].style) && (c = t);
				}
				c ? (c.to = r, c.step = a) : i.push({
					style: n,
					from: Math.max(o, t),
					to: r,
					step: a
				});
			}
		}
	}), i.forEach((t) => e.step(new bt(t.from, t.to, t.style)));
}
function Dt(e, t, n, r = n.contentMatch, i = !0) {
	let o = e.doc.nodeAt(t), s = [], c = t + 1;
	for (let t = 0; t < o.childCount; t++) {
		let l = o.child(t), u = c + l.nodeSize, f = r.matchType(l.type);
		if (!f) s.push(new Ct(c, u, d.empty));
		else {
			r = f;
			for (let t = 0; t < l.marks.length; t++) n.allowsMarkType(l.marks[t].type) || e.step(new bt(c, u, l.marks[t]));
			if (i && l.isText && n.whitespace != "pre") {
				let e, t = /\r?\n|\r/g, r;
				for (; e = t.exec(l.text);) r || (r = new d(a.from(n.schema.text(" ", n.allowedMarks(l.marks))), 0, 0)), s.push(new Ct(c + e.index, c + e.index + e[0].length, r));
			}
		}
		c = u;
	}
	if (!r.validEnd) {
		let t = r.fillBefore(a.empty, !0);
		e.replace(c, c, new d(t, 0, 0));
	}
	for (let t = s.length - 1; t >= 0; t--) e.step(s[t]);
}
function Ot(e, t, n) {
	return (t == 0 || e.canReplace(t, e.childCount)) && (n == e.childCount || e.canReplace(0, n));
}
function kt(e) {
	let t = e.parent.content.cutByIndex(e.startIndex, e.endIndex);
	for (let n = e.depth, r = 0, i = 0;; --n) {
		let a = e.$from.node(n), o = e.$from.index(n) + r, s = e.$to.indexAfter(n) - i;
		if (n < e.depth && a.canReplace(o, s, t)) return n;
		if (n == 0 || a.type.spec.isolating || !Ot(a, o, s)) break;
		o && (r = 1), s < a.childCount && (i = 1);
	}
	return null;
}
function At(e, t, n) {
	let { $from: r, $to: i, depth: o } = t, s = r.before(o + 1), c = i.after(o + 1), l = s, u = c, f = a.empty, p = 0;
	for (let e = o, t = !1; e > n; e--) t || r.index(e) > 0 ? (t = !0, f = a.from(r.node(e).copy(f)), p++) : l--;
	let m = a.empty, h = 0;
	for (let e = o, t = !1; e > n; e--) t || i.after(e + 1) < i.end(e) ? (t = !0, m = a.from(i.node(e).copy(m)), h++) : u++;
	e.step(new C(l, u, s, c, new d(f.append(m), p, h), f.size - p, !0));
}
function jt(e, t, n = null, r = e) {
	let i = Nt(e, t), a = i && Pt(r, t);
	return a ? i.map(Mt).concat({
		type: t,
		attrs: n
	}).concat(a.map(Mt)) : null;
}
function Mt(e) {
	return {
		type: e,
		attrs: null
	};
}
function Nt(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.contentMatchAt(r).findWrapping(t);
	if (!a) return null;
	let o = a.length ? a[0] : t;
	return n.canReplaceWith(r, i, o) ? a : null;
}
function Pt(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.child(r), o = t.contentMatch.findWrapping(a.type);
	if (!o) return null;
	let s = (o.length ? o[o.length - 1] : t).contentMatch;
	for (let e = r; s && e < i; e++) s = s.matchType(n.child(e).type);
	return !s || !s.validEnd ? null : o;
}
function Ft(e, t, n) {
	let r = a.empty;
	for (let e = n.length - 1; e >= 0; e--) {
		if (r.size) {
			let t = n[e].type.contentMatch.matchFragment(r);
			if (!t || !t.validEnd) throw RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
		}
		r = a.from(n[e].type.create(n[e].attrs, r));
	}
	let i = t.start, o = t.end;
	e.step(new C(i, o, i, o, new d(r, 0, 0), n.length, !0));
}
function It(e, t, n, r, i) {
	if (!r.isTextblock) throw RangeError("Type given to setBlockType should be a textblock");
	let o = e.steps.length;
	e.doc.nodesBetween(t, n, (t, n) => {
		let s = typeof i == "function" ? i(t) : i;
		if (t.isTextblock && !t.hasMarkup(r, s) && zt(e.doc, e.mapping.slice(o).map(n), r)) {
			let i = null;
			if (r.schema.linebreakReplacement) {
				let e = r.whitespace == "pre", t = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
				e && !t ? i = !1 : !e && t && (i = !0);
			}
			i === !1 && Rt(e, t, n, o), Dt(e, e.mapping.slice(o).map(n, 1), r, void 0, i === null);
			let c = e.mapping.slice(o), l = c.map(n, 1), u = c.map(n + t.nodeSize, 1);
			return e.step(new C(l, u, l + 1, u - 1, new d(a.from(r.create(s, null, t.marks)), 0, 0), 1, !0)), i === !0 && Lt(e, t, n, o), !1;
		}
	});
}
function Lt(e, t, n, r) {
	t.forEach((i, a) => {
		if (i.isText) {
			let o, s = /\r?\n|\r/g;
			for (; o = s.exec(i.text);) {
				let i = e.mapping.slice(r).map(n + 1 + a + o.index);
				e.replaceWith(i, i + 1, t.type.schema.linebreakReplacement.create());
			}
		}
	});
}
function Rt(e, t, n, r) {
	t.forEach((i, a) => {
		if (i.type == i.type.schema.linebreakReplacement) {
			let i = e.mapping.slice(r).map(n + 1 + a);
			e.replaceWith(i, i + 1, t.type.schema.text("\n"));
		}
	});
}
function zt(e, t, n) {
	let r = e.resolve(t), i = r.index();
	return r.parent.canReplaceWith(i, i + 1, n);
}
function Bt(e, t, n, r, i) {
	let o = e.doc.nodeAt(t);
	if (!o) throw RangeError("No node at given position");
	n || (n = o.type);
	let s = n.create(r, null, i || o.marks);
	if (o.isLeaf) return e.replaceWith(t, t + o.nodeSize, s);
	if (!n.validContent(o.content)) throw RangeError("Invalid content for node type " + n.name);
	e.step(new C(t, t + o.nodeSize, t + 1, t + o.nodeSize - 1, new d(a.from(s), 0, 0), 1, !0));
}
function Vt(e, t, n = 1, r) {
	let i = e.resolve(t), a = i.depth - n, o = r && r[r.length - 1] || i.parent;
	if (a < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !o.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount))) return !1;
	for (let e = i.depth - 1, t = n - 2; e > a; e--, t--) {
		let n = i.node(e), a = i.index(e);
		if (n.type.spec.isolating) return !1;
		let o = n.content.cutByIndex(a, n.childCount), s = r && r[t + 1];
		s && (o = o.replaceChild(0, s.type.create(s.attrs)));
		let c = r && r[t] || n;
		if (!n.canReplace(a + 1, n.childCount) || !c.type.validContent(o)) return !1;
	}
	let s = i.indexAfter(a), c = r && r[0];
	return i.node(a).canReplaceWith(s, s, c ? c.type : i.node(a + 1).type);
}
function Ht(e, t, n = 1, r) {
	let i = e.doc.resolve(t), o = a.empty, s = a.empty;
	for (let e = i.depth, t = i.depth - n, c = n - 1; e > t; e--, c--) {
		o = a.from(i.node(e).copy(o));
		let t = r && r[c];
		s = a.from(t ? t.type.create(t.attrs, s) : i.node(e).copy(s));
	}
	e.step(new Ct(t, t, new d(o.append(s), n, n), !0));
}
function Ut(e, t) {
	let n = e.resolve(t), r = n.index();
	return Gt(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function Wt(e, t) {
	t.content.size || e.type.compatibleContent(t.type);
	let n = e.contentMatchAt(e.childCount), { linebreakReplacement: r } = e.type.schema;
	for (let i = 0; i < t.childCount; i++) {
		let a = t.child(i), o = a.type == r ? e.type.schema.nodes.text : a.type;
		if (n = n.matchType(o), !n || !e.type.allowsMarks(a.marks)) return !1;
	}
	return n.validEnd;
}
function Gt(e, t) {
	return !!(e && t && !e.isLeaf && Wt(e, t));
}
function Kt(e, t, n) {
	let r = null, { linebreakReplacement: i } = e.doc.type.schema, a = e.doc.resolve(t - n), o = a.node().type;
	if (i && o.inlineContent) {
		let e = o.whitespace == "pre", t = !!o.contentMatch.matchType(i);
		e && !t ? r = !1 : !e && t && (r = !0);
	}
	let s = e.steps.length;
	if (r === !1) {
		let r = e.doc.resolve(t + n);
		Rt(e, r.node(), r.before(), s);
	}
	o.inlineContent && Dt(e, t + n - 1, o, a.node().contentMatchAt(a.index()), r == null);
	let c = e.mapping.slice(s), l = c.map(t - n);
	if (e.step(new Ct(l, c.map(t + n, -1), d.empty, !0)), r === !0) {
		let t = e.doc.resolve(l);
		Lt(e, t.node(), t.before(), e.steps.length);
	}
	return e;
}
function qt(e, t, n) {
	let r = e.resolve(t);
	if (r.parent.canReplaceWith(r.index(), r.index(), n)) return t;
	if (r.parentOffset == 0) for (let e = r.depth - 1; e >= 0; e--) {
		let t = r.index(e);
		if (r.node(e).canReplaceWith(t, t, n)) return r.before(e + 1);
		if (t > 0) return null;
	}
	if (r.parentOffset == r.parent.content.size) for (let e = r.depth - 1; e >= 0; e--) {
		let t = r.indexAfter(e);
		if (r.node(e).canReplaceWith(t, t, n)) return r.after(e + 1);
		if (t < r.node(e).childCount) return null;
	}
	return null;
}
function Jt(e, t, n) {
	let r = e.resolve(t);
	if (!n.content.size) return t;
	let i = n.content;
	for (let e = 0; e < n.openStart; e++) i = i.firstChild.content;
	for (let e = 1; e <= (n.openStart == 0 && n.size ? 2 : 1); e++) for (let t = r.depth; t >= 0; t--) {
		let n = t == r.depth ? 0 : r.pos <= (r.start(t + 1) + r.end(t + 1)) / 2 ? -1 : 1, a = r.index(t) + +(n > 0), o = r.node(t), s = !1;
		if (e == 1) s = o.canReplace(a, a, i);
		else {
			let e = o.contentMatchAt(a).findWrapping(i.firstChild.type);
			s = e && o.canReplaceWith(a, a, e[0]);
		}
		if (s) return n == 0 ? r.pos : n < 0 ? r.before(t + 1) : r.after(t + 1);
	}
	return null;
}
function Yt(e, t, n = t, r = d.empty) {
	if (t == n && !r.size) return null;
	let i = e.resolve(t), a = e.resolve(n);
	return Xt(i, a, r) ? new Ct(t, n, r) : new Zt(i, a, r).fit();
}
function Xt(e, t, n) {
	return !n.openStart && !n.openEnd && e.start() == t.start() && e.parent.canReplace(e.index(), t.index(), n.content);
}
var Zt = class {
	constructor(e, t, n) {
		this.$from = e, this.$to = t, this.unplaced = n, this.frontier = [], this.placed = a.empty;
		for (let t = 0; t <= e.depth; t++) {
			let n = e.node(t);
			this.frontier.push({
				type: n.type,
				match: n.contentMatchAt(e.indexAfter(t))
			});
		}
		for (let t = e.depth; t > 0; t--) this.placed = a.from(e.node(t).copy(this.placed));
	}
	get depth() {
		return this.frontier.length - 1;
	}
	fit() {
		for (; this.unplaced.size;) {
			let e = this.findFittable();
			e ? this.placeNodes(e) : this.openMore() || this.dropNode();
		}
		let e = this.mustMoveInline(), t = this.placed.size - this.depth - this.$from.depth, n = this.$from, r = this.close(e < 0 ? this.$to : n.doc.resolve(e));
		if (!r) return null;
		let i = this.placed, a = n.depth, o = r.depth;
		for (; a && o && i.childCount == 1;) i = i.firstChild.content, a--, o--;
		let s = new d(i, a, o);
		return e > -1 ? new C(n.pos, e, this.$to.pos, this.$to.end(), s, t) : s.size || n.pos != this.$to.pos ? new Ct(n.pos, r.pos, s) : null;
	}
	findFittable() {
		let e = this.unplaced.openStart;
		for (let t = this.unplaced.content, n = 0, r = this.unplaced.openEnd; n < e; n++) {
			let i = t.firstChild;
			if (t.childCount > 1 && (r = 0), i.type.spec.isolating && r <= n) {
				e = n;
				break;
			}
			t = i.content;
		}
		for (let t = 1; t <= 2; t++) for (let n = t == 1 ? e : this.unplaced.openStart; n >= 0; n--) {
			let e, r = null;
			n ? (r = en(this.unplaced.content, n - 1).firstChild, e = r.content) : e = this.unplaced.content;
			let i = e.firstChild;
			for (let e = this.depth; e >= 0; e--) {
				let { type: o, match: s } = this.frontier[e], c, l = null;
				if (t == 1 && (i ? s.matchType(i.type) || (l = s.fillBefore(a.from(i), !1)) : r && o.compatibleContent(r.type))) return {
					sliceDepth: n,
					frontierDepth: e,
					parent: r,
					inject: l
				};
				if (t == 2 && i && (c = s.findWrapping(i.type))) return {
					sliceDepth: n,
					frontierDepth: e,
					parent: r,
					wrap: c
				};
				if (r && s.matchType(r.type)) break;
			}
		}
	}
	openMore() {
		let { content: e, openStart: t, openEnd: n } = this.unplaced, r = en(e, t);
		return !r.childCount || r.firstChild.isLeaf ? !1 : (this.unplaced = new d(e, t + 1, Math.max(n, r.size + t >= e.size - n ? t + 1 : 0)), !0);
	}
	dropNode() {
		let { content: e, openStart: t, openEnd: n } = this.unplaced, r = en(e, t);
		if (r.childCount <= 1 && t > 0) {
			let i = e.size - t <= t + r.size;
			this.unplaced = new d(Qt(e, t - 1, 1), t - 1, i ? t - 1 : n);
		} else this.unplaced = new d(Qt(e, t, 1), t, n);
	}
	placeNodes({ sliceDepth: e, frontierDepth: t, parent: n, inject: r, wrap: i }) {
		for (; this.depth > t;) this.closeFrontierNode();
		if (i) for (let e = 0; e < i.length; e++) this.openFrontierNode(i[e]);
		let o = this.unplaced, s = n ? n.content : o.content, c = o.openStart - e, l = 0, u = [], { match: f, type: p } = this.frontier[t];
		if (r) {
			for (let e = 0; e < r.childCount; e++) u.push(r.child(e));
			f = f.matchFragment(r);
		}
		let m = s.size + e - (o.content.size - o.openEnd);
		for (; l < s.childCount;) {
			let e = s.child(l), t = f.matchType(e.type);
			if (!t) break;
			l++, (l > 1 || c == 0 || e.content.size) && (f = t, u.push(tn(e.mark(p.allowedMarks(e.marks)), l == 1 ? c : 0, l == s.childCount ? m : -1)));
		}
		let h = l == s.childCount;
		h || (m = -1), this.placed = $t(this.placed, t, a.from(u)), this.frontier[t].match = f, h && m < 0 && n && n.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
		for (let e = 0, t = s; e < m; e++) {
			let e = t.lastChild;
			this.frontier.push({
				type: e.type,
				match: e.contentMatchAt(e.childCount)
			}), t = e.content;
		}
		this.unplaced = h ? e == 0 ? d.empty : new d(Qt(o.content, e - 1, 1), e - 1, m < 0 ? o.openEnd : e - 1) : new d(Qt(o.content, e, l), o.openStart, o.openEnd);
	}
	mustMoveInline() {
		if (!this.$to.parent.isTextblock) return -1;
		let e = this.frontier[this.depth], t;
		if (!e.type.isTextblock || !nn(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (t = this.findCloseLevel(this.$to)) && t.depth == this.depth) return -1;
		let { depth: n } = this.$to, r = this.$to.after(n);
		for (; n > 1 && r == this.$to.end(--n);) ++r;
		return r;
	}
	findCloseLevel(e) {
		scan: for (let t = Math.min(this.depth, e.depth); t >= 0; t--) {
			let { match: n, type: r } = this.frontier[t], i = t < e.depth && e.end(t + 1) == e.pos + (e.depth - (t + 1)), a = nn(e, t, r, n, i);
			if (a) {
				for (let n = t - 1; n >= 0; n--) {
					let { match: t, type: r } = this.frontier[n], i = nn(e, n, r, t, !0);
					if (!i || i.childCount) continue scan;
				}
				return {
					depth: t,
					fit: a,
					move: i ? e.doc.resolve(e.after(t + 1)) : e
				};
			}
		}
	}
	close(e) {
		let t = this.findCloseLevel(e);
		if (!t) return null;
		for (; this.depth > t.depth;) this.closeFrontierNode();
		t.fit.childCount && (this.placed = $t(this.placed, t.depth, t.fit)), e = t.move;
		for (let n = t.depth + 1; n <= e.depth; n++) {
			let t = e.node(n), r = t.type.contentMatch.fillBefore(t.content, !0, e.index(n));
			this.openFrontierNode(t.type, t.attrs, r);
		}
		return e;
	}
	openFrontierNode(e, t = null, n) {
		let r = this.frontier[this.depth];
		r.match = r.match.matchType(e), this.placed = $t(this.placed, this.depth, a.from(e.create(t, n))), this.frontier.push({
			type: e,
			match: e.contentMatch
		});
	}
	closeFrontierNode() {
		let e = this.frontier.pop().match.fillBefore(a.empty, !0);
		e.childCount && (this.placed = $t(this.placed, this.frontier.length, e));
	}
};
function Qt(e, t, n) {
	return t == 0 ? e.cutByIndex(n, e.childCount) : e.replaceChild(0, e.firstChild.copy(Qt(e.firstChild.content, t - 1, n)));
}
function $t(e, t, n) {
	return t == 0 ? e.append(n) : e.replaceChild(e.childCount - 1, e.lastChild.copy($t(e.lastChild.content, t - 1, n)));
}
function en(e, t) {
	for (let n = 0; n < t; n++) e = e.firstChild.content;
	return e;
}
function tn(e, t, n) {
	if (t <= 0) return e;
	let r = e.content;
	return t > 1 && (r = r.replaceChild(0, tn(r.firstChild, t - 1, r.childCount == 1 ? n - 1 : 0))), t > 0 && (r = e.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(e.type.contentMatch.matchFragment(r).fillBefore(a.empty, !0)))), e.copy(r);
}
function nn(e, t, n, r, i) {
	let a = e.node(t), o = i ? e.indexAfter(t) : e.index(t);
	if (o == a.childCount && !n.compatibleContent(a.type)) return null;
	let s = r.fillBefore(a.content, !0, o);
	return s && !rn(n, a.content, o) ? s : null;
}
function rn(e, t, n) {
	for (let r = n; r < t.childCount; r++) if (!e.allowsMarks(t.child(r).marks)) return !0;
	return !1;
}
function an(e) {
	return e.spec.defining || e.spec.definingForContent;
}
function on(e, t, n, r) {
	if (!r.size) return e.deleteRange(t, n);
	let i = e.doc.resolve(t), a = e.doc.resolve(n);
	if (Xt(i, a, r)) return e.step(new Ct(t, n, r));
	let o = un(i, a);
	o[o.length - 1] == 0 && o.pop();
	let s = -(i.depth + 1);
	o.unshift(s);
	for (let e = i.depth, t = i.pos - 1; e > 0; e--, t--) {
		let n = i.node(e).type.spec;
		if (n.defining || n.definingAsContext || n.isolating) break;
		o.indexOf(e) > -1 ? s = e : i.before(e) == t && o.splice(1, 0, -e);
	}
	let c = o.indexOf(s), l = [], u = r.openStart;
	for (let e = r.content, t = 0;; t++) {
		let n = e.firstChild;
		if (l.push(n), t == r.openStart) break;
		e = n.content;
	}
	for (let e = u - 1; e >= 0; e--) {
		let t = l[e], n = an(t.type);
		if (n && !t.sameMarkup(i.node(Math.abs(s) - 1))) u = e;
		else if (n || !t.type.isTextblock) break;
	}
	for (let t = r.openStart; t >= 0; t--) {
		let s = (t + u + 1) % (r.openStart + 1), f = l[s];
		if (f) for (let t = 0; t < o.length; t++) {
			let l = o[(t + c) % o.length], u = !0;
			l < 0 && (u = !1, l = -l);
			let p = i.node(l - 1), m = i.index(l - 1);
			if (p.canReplaceWith(m, m, f.type, f.marks)) return e.replace(i.before(l), u ? a.after(l) : n, new d(sn(r.content, 0, r.openStart, s), s, r.openEnd));
		}
	}
	let f = e.steps.length;
	for (let s = o.length - 1; s >= 0 && (e.replace(t, n, r), !(e.steps.length > f)); s--) {
		let e = o[s];
		e < 0 || (t = i.before(e), n = a.after(e));
	}
}
function sn(e, t, n, r, i) {
	if (t < n) {
		let i = e.firstChild;
		e = e.replaceChild(0, i.copy(sn(i.content, t + 1, n, r, i)));
	}
	if (t > r) {
		let t = i.contentMatchAt(0), n = t.fillBefore(e).append(e);
		e = n.append(t.matchFragment(n).fillBefore(a.empty, !0));
	}
	return e;
}
function cn(e, t, n, r) {
	if (!r.isInline && t == n && e.doc.resolve(t).parent.content.size) {
		let i = qt(e.doc, t, r.type);
		i != null && (t = n = i);
	}
	e.replaceRange(t, n, new d(a.from(r), 0, 0));
}
function ln(e, t, n) {
	let r = e.doc.resolve(t), i = e.doc.resolve(n);
	if (r.parent.isTextblock && i.parent.isTextblock && r.start() != i.start() && r.parentOffset == 0 && i.parentOffset == 0) {
		let a = r.sharedDepth(n), o = !1;
		for (let e = r.depth; e > a; e--) r.node(e).type.spec.isolating && (o = !0);
		for (let e = i.depth; e > a; e--) i.node(e).type.spec.isolating && (o = !0);
		if (!o) {
			for (let e = r.depth; e > 0 && t == r.start(e); e--) t = r.before(e);
			for (let e = i.depth; e > 0 && n == i.start(e); e--) n = i.before(e);
			r = e.doc.resolve(t), i = e.doc.resolve(n);
		}
	}
	let a = un(r, i);
	for (let t = 0; t < a.length; t++) {
		let n = a[t], o = t == a.length - 1;
		if (o && n == 0 || r.node(n).type.contentMatch.validEnd) return e.delete(r.start(n), i.end(n));
		if (n > 0 && (o || r.node(n - 1).canReplace(r.index(n - 1), i.indexAfter(n - 1)))) return e.delete(r.before(n), i.after(n));
	}
	for (let a = 1; a <= r.depth && a <= i.depth; a++) if (t - r.start(a) == r.depth - a && n > r.end(a) && i.end(a) - n != i.depth - a && r.start(a - 1) == i.start(a - 1) && r.node(a - 1).canReplace(r.index(a - 1), i.index(a - 1))) return e.delete(r.before(a), n);
	e.delete(t, n);
}
function un(e, t) {
	let n = [], r = Math.min(e.depth, t.depth);
	for (let i = r; i >= 0; i--) {
		let r = e.start(i);
		if (r < e.pos - (e.depth - i) || t.end(i) > t.pos + (t.depth - i) || e.node(i).type.spec.isolating || t.node(i).type.spec.isolating) break;
		(r == t.start(i) || i == e.depth && i == t.depth && e.parent.inlineContent && t.parent.inlineContent && i && t.start(i - 1) == r - 1) && n.push(i);
	}
	return n;
}
var dn = class e extends x {
	constructor(e, t, n) {
		super(), this.pos = e, this.attr = t, this.value = n;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return S.fail("No node at attribute step's position");
		let n = Object.create(null);
		for (let e in t.attrs) n[e] = t.attrs[e];
		n[this.attr] = this.value;
		let r = t.type.create(n, null, t.marks);
		return S.fromReplace(e, this.pos, this.pos + 1, new d(a.from(r), 0, +!t.isLeaf));
	}
	getMap() {
		return ht.empty;
	}
	invert(t) {
		return new e(this.pos, this.attr, t.nodeAt(this.pos).attrs[this.attr]);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.attr, this.value);
	}
	toJSON() {
		return {
			stepType: "attr",
			pos: this.pos,
			attr: this.attr,
			value: this.value
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number" || typeof n.attr != "string") throw RangeError("Invalid input for AttrStep.fromJSON");
		return new e(n.pos, n.attr, n.value);
	}
};
x.jsonID("attr", dn);
var fn = class e extends x {
	constructor(e, t) {
		super(), this.attr = e, this.value = t;
	}
	apply(e) {
		let t = Object.create(null);
		for (let n in e.attrs) t[n] = e.attrs[n];
		t[this.attr] = this.value;
		let n = e.type.create(t, e.content, e.marks);
		return S.ok(n);
	}
	getMap() {
		return ht.empty;
	}
	invert(t) {
		return new e(this.attr, t.attrs[this.attr]);
	}
	map(e) {
		return this;
	}
	toJSON() {
		return {
			stepType: "docAttr",
			attr: this.attr,
			value: this.value
		};
	}
	static fromJSON(t, n) {
		if (typeof n.attr != "string") throw RangeError("Invalid input for DocAttrStep.fromJSON");
		return new e(n.attr, n.value);
	}
};
x.jsonID("docAttr", fn);
var pn = class extends Error {};
pn = function e(t) {
	let n = Error.call(this, t);
	return n.__proto__ = e.prototype, n;
}, pn.prototype = Object.create(Error.prototype), pn.prototype.constructor = pn, pn.prototype.name = "TransformError";
var mn = class {
	constructor(e) {
		this.doc = e, this.steps = [], this.docs = [], this.mapping = new gt();
	}
	get before() {
		return this.docs.length ? this.docs[0] : this.doc;
	}
	step(e) {
		let t = this.maybeStep(e);
		if (t.failed) throw new pn(t.failed);
		return this;
	}
	maybeStep(e) {
		let t = e.apply(this.doc);
		return t.failed || this.addStep(e, t.doc), t;
	}
	get docChanged() {
		return this.steps.length > 0;
	}
	changedRange() {
		let e = 1e9, t = -1e9;
		for (let n = 0; n < this.mapping.maps.length; n++) {
			let r = this.mapping.maps[n];
			n && (e = r.map(e, 1), t = r.map(t, -1)), r.forEach((n, r, i, a) => {
				e = Math.min(e, i), t = Math.max(t, a);
			});
		}
		return e == 1e9 ? null : {
			from: e,
			to: t
		};
	}
	addStep(e, t) {
		this.docs.push(this.doc), this.steps.push(e), this.mapping.appendMap(e.getMap()), this.doc = t;
	}
	replace(e, t = e, n = d.empty) {
		let r = Yt(this.doc, e, t, n);
		return r && this.step(r), this;
	}
	replaceWith(e, t, n) {
		return this.replace(e, t, new d(a.from(n), 0, 0));
	}
	delete(e, t) {
		return this.replace(e, t, d.empty);
	}
	insert(e, t) {
		return this.replaceWith(e, e, t);
	}
	replaceRange(e, t, n) {
		return on(this, e, t, n), this;
	}
	replaceRangeWith(e, t, n) {
		return cn(this, e, t, n), this;
	}
	deleteRange(e, t) {
		return ln(this, e, t), this;
	}
	lift(e, t) {
		return At(this, e, t), this;
	}
	join(e, t = 1) {
		return Kt(this, e, t), this;
	}
	wrap(e, t) {
		return Ft(this, e, t), this;
	}
	setBlockType(e, t = e, n, r = null) {
		return It(this, e, t, n, r), this;
	}
	setNodeMarkup(e, t, n = null, r) {
		return Bt(this, e, t, n, r), this;
	}
	setNodeAttribute(e, t, n) {
		return this.step(new dn(e, t, n)), this;
	}
	setDocAttribute(e, t) {
		return this.step(new fn(e, t)), this;
	}
	addNodeMark(e, t) {
		return this.step(new xt(e, t)), this;
	}
	removeNodeMark(e, t) {
		let n = this.doc.nodeAt(e);
		if (!n) throw RangeError("No node at position " + e);
		if (t instanceof l) t.isInSet(n.marks) && this.step(new St(e, t));
		else {
			let r = n.marks, i, a = [];
			for (; i = t.isInSet(r);) a.push(new St(e, i)), r = i.removeFromSet(r);
			for (let e = a.length - 1; e >= 0; e--) this.step(a[e]);
		}
		return this;
	}
	split(e, t = 1, n) {
		return Ht(this, e, t, n), this;
	}
	addMark(e, t, n) {
		return Tt(this, e, t, n), this;
	}
	removeMark(e, t, n) {
		return Et(this, e, t, n), this;
	}
	clearIncompatible(e, t, n) {
		return Dt(this, e, t, n), this;
	}
}, hn = Object.create(null), w = class {
	constructor(e, t, n) {
		this.$anchor = e, this.$head = t, this.ranges = n || [new gn(e.min(t), e.max(t))];
	}
	get anchor() {
		return this.$anchor.pos;
	}
	get head() {
		return this.$head.pos;
	}
	get from() {
		return this.$from.pos;
	}
	get to() {
		return this.$to.pos;
	}
	get $from() {
		return this.ranges[0].$from;
	}
	get $to() {
		return this.ranges[0].$to;
	}
	get empty() {
		let e = this.ranges;
		for (let t = 0; t < e.length; t++) if (e[t].$from.pos != e[t].$to.pos) return !1;
		return !0;
	}
	content() {
		return this.$from.doc.slice(this.from, this.to, !0);
	}
	replace(e, t = d.empty) {
		let n = t.content.lastChild, r = null;
		for (let e = 0; e < t.openEnd; e++) r = n, n = n.lastChild;
		let i = e.steps.length, a = this.ranges;
		for (let o = 0; o < a.length; o++) {
			let { $from: s, $to: c } = a[o], l = e.mapping.slice(i);
			e.replaceRange(l.map(s.pos), l.map(c.pos), o ? d.empty : t), o == 0 && wn(e, i, (n ? n.isInline : r && r.isTextblock) ? -1 : 1);
		}
	}
	replaceWith(e, t) {
		let n = e.steps.length, r = this.ranges;
		for (let i = 0; i < r.length; i++) {
			let { $from: a, $to: o } = r[i], s = e.mapping.slice(n), c = s.map(a.pos), l = s.map(o.pos);
			i ? e.deleteRange(c, l) : (e.replaceRangeWith(c, l, t), wn(e, n, t.isInline ? -1 : 1));
		}
	}
	static findFrom(e, t, n = !1) {
		let r = e.parent.inlineContent ? new T(e) : Cn(e.node(0), e.parent, e.pos, e.index(), t, n);
		if (r) return r;
		for (let r = e.depth - 1; r >= 0; r--) {
			let i = t < 0 ? Cn(e.node(0), e.node(r), e.before(r + 1), e.index(r), t, n) : Cn(e.node(0), e.node(r), e.after(r + 1), e.index(r) + 1, t, n);
			if (i) return i;
		}
		return null;
	}
	static near(e, t = 1) {
		return this.findFrom(e, t) || this.findFrom(e, -t) || new xn(e.node(0));
	}
	static atStart(e) {
		return Cn(e, e, 0, 0, 1) || new xn(e);
	}
	static atEnd(e) {
		return Cn(e, e, e.content.size, e.childCount, -1) || new xn(e);
	}
	static fromJSON(e, t) {
		if (!t || !t.type) throw RangeError("Invalid input for Selection.fromJSON");
		let n = hn[t.type];
		if (!n) throw RangeError(`No selection type ${t.type} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in hn) throw RangeError("Duplicate use of selection JSON ID " + e);
		return hn[e] = t, t.prototype.jsonID = e, t;
	}
	getBookmark() {
		return T.between(this.$anchor, this.$head).getBookmark();
	}
};
w.prototype.visible = !0;
var gn = class {
	constructor(e, t) {
		this.$from = e, this.$to = t;
	}
}, _n = !1;
function vn(e) {
	!_n && !e.parent.inlineContent && (_n = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + e.parent.type.name + ")"));
}
var T = class e extends w {
	constructor(e, t = e) {
		vn(e), vn(t), super(e, t);
	}
	get $cursor() {
		return this.$anchor.pos == this.$head.pos ? this.$head : null;
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		if (!r.parent.inlineContent) return w.near(r);
		let i = t.resolve(n.map(this.anchor));
		return new e(i.parent.inlineContent ? i : r, r);
	}
	replace(e, t = d.empty) {
		if (super.replace(e, t), t == d.empty) {
			let t = this.$from.marksAcross(this.$to);
			t && e.ensureMarks(t);
		}
	}
	eq(t) {
		return t instanceof e && t.anchor == this.anchor && t.head == this.head;
	}
	getBookmark() {
		return new yn(this.anchor, this.head);
	}
	toJSON() {
		return {
			type: "text",
			anchor: this.anchor,
			head: this.head
		};
	}
	static fromJSON(t, n) {
		if (typeof n.anchor != "number" || typeof n.head != "number") throw RangeError("Invalid input for TextSelection.fromJSON");
		return new e(t.resolve(n.anchor), t.resolve(n.head));
	}
	static create(e, t, n = t) {
		let r = e.resolve(t);
		return new this(r, n == t ? r : e.resolve(n));
	}
	static between(t, n, r) {
		let i = t.pos - n.pos;
		if ((!r || i) && (r = i >= 0 ? 1 : -1), !n.parent.inlineContent) {
			let e = w.findFrom(n, r, !0) || w.findFrom(n, -r, !0);
			if (e) n = e.$head;
			else return w.near(n, r);
		}
		return t.parent.inlineContent || (i == 0 ? t = n : (t = (w.findFrom(t, -r, !0) || w.findFrom(t, r, !0)).$anchor, t.pos < n.pos != i < 0 && (t = n))), new e(t, n);
	}
};
w.jsonID("text", T);
var yn = class e {
	constructor(e, t) {
		this.anchor = e, this.head = t;
	}
	map(t) {
		return new e(t.map(this.anchor), t.map(this.head));
	}
	resolve(e) {
		return T.between(e.resolve(this.anchor), e.resolve(this.head));
	}
}, E = class e extends w {
	constructor(e) {
		let t = e.nodeAfter, n = e.node(0).resolve(e.pos + t.nodeSize);
		super(e, n), this.node = t;
	}
	map(t, n) {
		let { deleted: r, pos: i } = n.mapResult(this.anchor), a = t.resolve(i);
		return r ? w.near(a) : new e(a);
	}
	content() {
		return new d(a.from(this.node), 0, 0);
	}
	eq(t) {
		return t instanceof e && t.anchor == this.anchor;
	}
	toJSON() {
		return {
			type: "node",
			anchor: this.anchor
		};
	}
	getBookmark() {
		return new bn(this.anchor);
	}
	static fromJSON(t, n) {
		if (typeof n.anchor != "number") throw RangeError("Invalid input for NodeSelection.fromJSON");
		return new e(t.resolve(n.anchor));
	}
	static create(t, n) {
		return new e(t.resolve(n));
	}
	static isSelectable(e) {
		return !e.isText && e.type.spec.selectable !== !1;
	}
};
E.prototype.visible = !1, w.jsonID("node", E);
var bn = class e {
	constructor(e) {
		this.anchor = e;
	}
	map(t) {
		let { deleted: n, pos: r } = t.mapResult(this.anchor);
		return n ? new yn(r, r) : new e(r);
	}
	resolve(e) {
		let t = e.resolve(this.anchor), n = t.nodeAfter;
		return n && E.isSelectable(n) ? new E(t) : w.near(t);
	}
}, xn = class e extends w {
	constructor(e) {
		super(e.resolve(0), e.resolve(e.content.size));
	}
	replace(e, t = d.empty) {
		if (t == d.empty) {
			e.delete(0, e.doc.content.size);
			let t = w.atStart(e.doc);
			t.eq(e.selection) || e.setSelection(t);
		} else super.replace(e, t);
	}
	toJSON() {
		return { type: "all" };
	}
	static fromJSON(t) {
		return new e(t);
	}
	map(t) {
		return new e(t);
	}
	eq(t) {
		return t instanceof e;
	}
	getBookmark() {
		return Sn;
	}
};
w.jsonID("all", xn);
var Sn = {
	map() {
		return this;
	},
	resolve(e) {
		return new xn(e);
	}
};
function Cn(e, t, n, r, i, a = !1) {
	if (t.inlineContent) return T.create(e, n);
	for (let o = r - (i > 0 ? 0 : 1); i > 0 ? o < t.childCount : o >= 0; o += i) {
		let r = t.child(o);
		if (!r.isAtom) {
			let t = Cn(e, r, n + i, i < 0 ? r.childCount : 0, i, a);
			if (t) return t;
		} else if (!a && E.isSelectable(r)) return E.create(e, n - (i < 0 ? r.nodeSize : 0));
		n += r.nodeSize * i;
	}
	return null;
}
function wn(e, t, n) {
	let r = e.steps.length - 1;
	if (r < t) return;
	let i = e.steps[r];
	if (!(i instanceof Ct || i instanceof C)) return;
	let a = e.mapping.maps[r], o;
	a.forEach((e, t, n, r) => {
		o ?? (o = r);
	}), e.setSelection(w.near(e.doc.resolve(o), n));
}
var Tn = 1, En = 2, Dn = 4, On = class extends mn {
	constructor(e) {
		super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
	}
	get selection() {
		return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
	}
	setSelection(e) {
		if (e.$from.doc != this.doc) throw RangeError("Selection passed to setSelection must point at the current document");
		return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | Tn) & -3, this.storedMarks = null, this;
	}
	get selectionSet() {
		return (this.updated & Tn) > 0;
	}
	setStoredMarks(e) {
		return this.storedMarks = e, this.updated |= En, this;
	}
	ensureMarks(e) {
		return l.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
	}
	addStoredMark(e) {
		return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
	}
	removeStoredMark(e) {
		return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
	}
	get storedMarksSet() {
		return (this.updated & En) > 0;
	}
	addStep(e, t) {
		super.addStep(e, t), this.updated &= -3, this.storedMarks = null;
	}
	setTime(e) {
		return this.time = e, this;
	}
	replaceSelection(e) {
		return this.selection.replace(this, e), this;
	}
	replaceSelectionWith(e, t = !0) {
		let n = this.selection;
		return t && (e = e.mark(this.storedMarks || (n.empty ? n.$from.marks() : n.$from.marksAcross(n.$to) || l.none))), n.replaceWith(this, e), this;
	}
	deleteSelection() {
		return this.selection.replace(this), this;
	}
	insertText(e, t, n) {
		let r = this.doc.type.schema;
		if (t == null) return e ? this.replaceSelectionWith(r.text(e), !0) : this.deleteSelection();
		{
			if (n ?? (n = t), !e) return this.deleteRange(t, n);
			let i = this.storedMarks;
			if (!i) {
				let e = this.doc.resolve(t);
				i = n == t ? e.marks() : e.marksAcross(this.doc.resolve(n));
			}
			return this.replaceRangeWith(t, n, r.text(e, i)), !this.selection.empty && this.selection.to == t + e.length && this.setSelection(w.near(this.selection.$to)), this;
		}
	}
	setMeta(e, t) {
		return this.meta[typeof e == "string" ? e : e.key] = t, this;
	}
	getMeta(e) {
		return this.meta[typeof e == "string" ? e : e.key];
	}
	get isGeneric() {
		for (let e in this.meta) return !1;
		return !0;
	}
	scrollIntoView() {
		return this.updated |= Dn, this;
	}
	get scrolledIntoView() {
		return (this.updated & Dn) > 0;
	}
};
function kn(e, t) {
	return !t || !e ? e : e.bind(t);
}
var An = class {
	constructor(e, t, n) {
		this.name = e, this.init = kn(t.init, n), this.apply = kn(t.apply, n);
	}
}, jn = [
	new An("doc", {
		init(e) {
			return e.doc || e.schema.topNodeType.createAndFill();
		},
		apply(e) {
			return e.doc;
		}
	}),
	new An("selection", {
		init(e, t) {
			return e.selection || w.atStart(t.doc);
		},
		apply(e) {
			return e.selection;
		}
	}),
	new An("storedMarks", {
		init(e) {
			return e.storedMarks || null;
		},
		apply(e, t, n, r) {
			return r.selection.$cursor ? e.storedMarks : null;
		}
	}),
	new An("scrollToSelection", {
		init() {
			return 0;
		},
		apply(e, t) {
			return e.scrolledIntoView ? t + 1 : t;
		}
	})
], Mn = class {
	constructor(e, t) {
		this.schema = e, this.plugins = [], this.pluginsByKey = Object.create(null), this.fields = jn.slice(), t && t.forEach((e) => {
			if (this.pluginsByKey[e.key]) throw RangeError("Adding different instances of a keyed plugin (" + e.key + ")");
			this.plugins.push(e), this.pluginsByKey[e.key] = e, e.spec.state && this.fields.push(new An(e.key, e.spec.state, e));
		});
	}
}, Nn = class e {
	constructor(e) {
		this.config = e;
	}
	get schema() {
		return this.config.schema;
	}
	get plugins() {
		return this.config.plugins;
	}
	apply(e) {
		return this.applyTransaction(e).state;
	}
	filterTransaction(e, t = -1) {
		for (let n = 0; n < this.config.plugins.length; n++) if (n != t) {
			let t = this.config.plugins[n];
			if (t.spec.filterTransaction && !t.spec.filterTransaction.call(t, e, this)) return !1;
		}
		return !0;
	}
	applyTransaction(e) {
		if (!this.filterTransaction(e)) return {
			state: this,
			transactions: []
		};
		let t = [e], n = this.applyInner(e), r = null;
		for (;;) {
			let i = !1;
			for (let a = 0; a < this.config.plugins.length; a++) {
				let o = this.config.plugins[a];
				if (o.spec.appendTransaction) {
					let s = r ? r[a].n : 0, c = r ? r[a].state : this, l = s < t.length && o.spec.appendTransaction.call(o, s ? t.slice(s) : t, c, n);
					if (l && n.filterTransaction(l, a)) {
						if (l.setMeta("appendedTransaction", e), !r) {
							r = [];
							for (let e = 0; e < this.config.plugins.length; e++) r.push(e < a ? {
								state: n,
								n: t.length
							} : {
								state: this,
								n: 0
							});
						}
						t.push(l), n = n.applyInner(l), i = !0;
					}
					r && (r[a] = {
						state: n,
						n: t.length
					});
				}
			}
			if (!i) return {
				state: n,
				transactions: t
			};
		}
	}
	applyInner(t) {
		if (!t.before.eq(this.doc)) throw RangeError("Applying a mismatched transaction");
		let n = new e(this.config), r = this.config.fields;
		for (let e = 0; e < r.length; e++) {
			let i = r[e];
			n[i.name] = i.apply(t, this[i.name], this, n);
		}
		return n;
	}
	get tr() {
		return new On(this);
	}
	static create(t) {
		let n = new Mn(t.doc ? t.doc.type.schema : t.schema, t.plugins), r = new e(n);
		for (let e = 0; e < n.fields.length; e++) r[n.fields[e].name] = n.fields[e].init(t, r);
		return r;
	}
	reconfigure(t) {
		let n = new Mn(this.schema, t.plugins), r = n.fields, i = new e(n);
		for (let e = 0; e < r.length; e++) {
			let n = r[e].name;
			i[n] = this.hasOwnProperty(n) ? this[n] : r[e].init(t, i);
		}
		return i;
	}
	toJSON(e) {
		let t = {
			doc: this.doc.toJSON(),
			selection: this.selection.toJSON()
		};
		if (this.storedMarks && (t.storedMarks = this.storedMarks.map((e) => e.toJSON())), e && typeof e == "object") for (let n in e) {
			if (n == "doc" || n == "selection") throw RangeError("The JSON fields `doc` and `selection` are reserved");
			let r = e[n], i = r.spec.state;
			i && i.toJSON && (t[n] = i.toJSON.call(r, this[r.key]));
		}
		return t;
	}
	static fromJSON(t, n, r) {
		if (!n) throw RangeError("Invalid input for EditorState.fromJSON");
		if (!t.schema) throw RangeError("Required config field 'schema' missing");
		let i = new Mn(t.schema, t.plugins), a = new e(i);
		return i.fields.forEach((e) => {
			if (e.name == "doc") a.doc = le.fromJSON(t.schema, n.doc);
			else if (e.name == "selection") a.selection = w.fromJSON(a.doc, n.selection);
			else if (e.name == "storedMarks") n.storedMarks && (a.storedMarks = n.storedMarks.map(t.schema.markFromJSON));
			else {
				if (r) for (let i in r) {
					let o = r[i], s = o.spec.state;
					if (o.key == e.name && s && s.fromJSON && Object.prototype.hasOwnProperty.call(n, i)) {
						a[e.name] = s.fromJSON.call(o, t, n[i], a);
						return;
					}
				}
				a[e.name] = e.init(t, a);
			}
		}), a;
	}
};
function Pn(e, t, n) {
	for (let r in e) {
		let i = e[r];
		i instanceof Function ? i = i.bind(t) : r == "handleDOMEvents" && (i = Pn(i, t, {})), n[r] = i;
	}
	return n;
}
var Fn = class {
	constructor(e) {
		this.spec = e, this.props = {}, e.props && Pn(e.props, this, this.props), this.key = e.key ? e.key.key : Ln("plugin");
	}
	getState(e) {
		return e[this.key];
	}
}, In = Object.create(null);
function Ln(e) {
	return e in In ? e + "$" + ++In[e] : (In[e] = 0, e + "$");
}
var Rn = class {
	constructor(e = "key") {
		this.key = Ln(e);
	}
	get(e) {
		return e.config.pluginsByKey[this.key];
	}
	getState(e) {
		return e[this.key];
	}
}, zn = (e, t) => !e.selection.empty && (t && t(e.tr.deleteSelection().scrollIntoView()), !0);
function Bn(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("backward", e) : n.parentOffset > 0) ? null : n;
}
var Vn = (e, t, n) => {
	let r = Bn(e, n);
	if (!r) return !1;
	let i = Wn(r);
	if (!i) {
		let n = r.blockRange(), i = n && kt(n);
		return i != null && (t && t(e.tr.lift(n, i).scrollIntoView()), !0);
	}
	let a = i.nodeBefore;
	if (ar(e, i, t, -1)) return !0;
	if (r.parent.content.size == 0 && (Hn(a, "end") || E.isSelectable(a))) for (let n = r.depth;; n--) {
		let o = Yt(e.doc, r.before(n), r.after(n), d.empty);
		if (o && o.slice.size < o.to - o.from) {
			if (t) {
				let n = e.tr.step(o);
				n.setSelection(Hn(a, "end") ? w.findFrom(n.doc.resolve(n.mapping.map(i.pos, -1)), -1) : E.create(n.doc, i.pos - a.nodeSize)), t(n.scrollIntoView());
			}
			return !0;
		}
		if (n == 1 || r.node(n - 1).childCount > 1) break;
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos - a.nodeSize, i.pos).scrollIntoView()), !0) : !1;
};
function Hn(e, t, n = !1) {
	for (let r = e; r; r = t == "start" ? r.firstChild : r.lastChild) {
		if (r.isTextblock) return !0;
		if (n && r.childCount != 1) return !1;
	}
	return !1;
}
var Un = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("backward", e) : r.parentOffset > 0) return !1;
		a = Wn(r);
	}
	let o = a && a.nodeBefore;
	return !o || !E.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(E.create(e.doc, a.pos - o.nodeSize)).scrollIntoView()), !0);
};
function Wn(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		if (e.index(t) > 0) return e.doc.resolve(e.before(t + 1));
		if (e.node(t).type.spec.isolating) break;
	}
	return null;
}
function Gn(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("forward", e) : n.parentOffset < n.parent.content.size) ? null : n;
}
var Kn = (e, t, n) => {
	let r = Gn(e, n);
	if (!r) return !1;
	let i = Jn(r);
	if (!i) return !1;
	let a = i.nodeAfter;
	if (ar(e, i, t, 1)) return !0;
	if (r.parent.content.size == 0 && (Hn(a, "start") || E.isSelectable(a))) {
		let n = Yt(e.doc, r.before(), r.after(), d.empty);
		if (n && n.slice.size < n.to - n.from) {
			if (t) {
				let r = e.tr.step(n);
				r.setSelection(Hn(a, "start") ? w.findFrom(r.doc.resolve(r.mapping.map(i.pos)), 1) : E.create(r.doc, r.mapping.map(i.pos))), t(r.scrollIntoView());
			}
			return !0;
		}
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos, i.pos + a.nodeSize).scrollIntoView()), !0) : !1;
}, qn = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("forward", e) : r.parentOffset < r.parent.content.size) return !1;
		a = Jn(r);
	}
	let o = a && a.nodeAfter;
	return !o || !E.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(E.create(e.doc, a.pos)).scrollIntoView()), !0);
};
function Jn(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		let n = e.node(t);
		if (e.index(t) + 1 < n.childCount) return e.doc.resolve(e.after(t + 1));
		if (n.type.spec.isolating) break;
	}
	return null;
}
var Yn = (e, t) => {
	let { $from: n, $to: r } = e.selection, i = n.blockRange(r), a = i && kt(i);
	return a != null && (t && t(e.tr.lift(i, a).scrollIntoView()), !0);
}, Xn = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (t && t(e.tr.insertText("\n").scrollIntoView()), !0);
};
function Zn(e) {
	for (let t = 0; t < e.edgeCount; t++) {
		let { type: n } = e.edge(t);
		if (n.isTextblock && !n.hasRequiredAttrs()) return n;
	}
	return null;
}
var Qn = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	if (!n.parent.type.spec.code || !n.sameParent(r)) return !1;
	let i = n.node(-1), a = n.indexAfter(-1), o = Zn(i.contentMatchAt(a));
	if (!o || !i.canReplaceWith(a, a, o)) return !1;
	if (t) {
		let r = n.after(), i = e.tr.replaceWith(r, r, o.createAndFill());
		i.setSelection(w.near(i.doc.resolve(r), 1)), t(i.scrollIntoView());
	}
	return !0;
}, $n = (e, t) => {
	let n = e.selection, { $from: r, $to: i } = n;
	if (n instanceof xn || r.parent.inlineContent || i.parent.inlineContent) return !1;
	let a = Zn(i.parent.contentMatchAt(i.indexAfter()));
	if (!a || !a.isTextblock) return !1;
	if (t) {
		let n = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, o = e.tr.insert(n, a.createAndFill());
		o.setSelection(T.create(o.doc, n + 1)), t(o.scrollIntoView());
	}
	return !0;
}, er = (e, t) => {
	let { $cursor: n } = e.selection;
	if (!n || n.parent.content.size) return !1;
	if (n.depth > 1 && n.after() != n.end(-1)) {
		let r = n.before();
		if (Vt(e.doc, r)) return t && t(e.tr.split(r).scrollIntoView()), !0;
	}
	let r = n.blockRange(), i = r && kt(r);
	return i != null && (t && t(e.tr.lift(r, i).scrollIntoView()), !0);
};
function tr(e) {
	return (t, n) => {
		if (t.selection instanceof E && t.selection.node.isBlock) {
			let { $from: e } = t.selection;
			return !e.parentOffset || !Vt(t.doc, e.pos) ? !1 : (n && n(t.tr.split(e.pos).scrollIntoView()), !0);
		}
		if (!t.selection.$from.depth) return !1;
		let r = t.tr;
		!t.selection.empty && (t.selection instanceof T || t.selection instanceof xn) && r.deleteSelection();
		let { $from: i } = r.selection, a = r.steps.length, o = [], s, c, l = !1, u = !1;
		for (let t = i.depth;; t--) if (i.node(t).isBlock) {
			l = i.end(t) == i.pos + (i.depth - t), u = i.start(t) == i.pos - (i.depth - t), c = Zn(i.node(t - 1).contentMatchAt(i.indexAfter(t - 1)));
			let n = e && e(i.parent, l, i);
			o.unshift(n || (l && c ? { type: c } : null)), s = t;
			break;
		} else {
			if (t == 1) return !1;
			o.unshift(null);
		}
		let d = i.pos, f = Vt(r.doc, d, o.length, o);
		if (f || (o[0] = c ? { type: c } : null, f = Vt(r.doc, d, o.length, o)), !f) return !1;
		if (r.split(d, o.length, o), !l && u && i.node(s).type != c) {
			let e = r.mapping.slice(a), t = e.map(i.before(s)), n = r.doc.resolve(t);
			c && i.node(s - 1).canReplaceWith(n.index(), n.index() + 1, c) && r.setNodeMarkup(e.map(i.before(s)), c);
		}
		return n && n(r.scrollIntoView()), !0;
	};
}
var nr = tr(), rr = (e, t) => (t && t(e.tr.setSelection(new xn(e.doc))), !0);
function ir(e, t, n) {
	let r = t.nodeBefore, i = t.nodeAfter, a = t.index();
	return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && t.parent.canReplace(a - 1, a) ? (n && n(e.tr.delete(t.pos - r.nodeSize, t.pos).scrollIntoView()), !0) : !t.parent.canReplace(a, a + 1) || !(i.isTextblock || Ut(e.doc, t.pos)) ? !1 : (n && n(e.tr.join(t.pos).scrollIntoView()), !0);
}
function ar(e, t, n, r) {
	let i = t.nodeBefore, o = t.nodeAfter, s, c, l = i.type.spec.isolating || o.type.spec.isolating;
	if (!l && ir(e, t, n)) return !0;
	let u = !l && t.parent.canReplace(t.index(), t.index() + 1);
	if (u && (s = (c = i.contentMatchAt(i.childCount)).findWrapping(o.type)) && c.matchType(s[0] || o.type).validEnd) {
		if (n) {
			let r = t.pos + o.nodeSize, c = a.empty;
			for (let e = s.length - 1; e >= 0; e--) c = a.from(s[e].create(null, c));
			c = a.from(i.copy(c));
			let l = e.tr.step(new C(t.pos - 1, r, t.pos, r, new d(c, 1, 0), s.length, !0)), u = l.doc.resolve(r + 2 * s.length);
			u.nodeAfter && u.nodeAfter.type == i.type && Ut(l.doc, u.pos) && l.join(u.pos), n(l.scrollIntoView());
		}
		return !0;
	}
	let f = o.type.spec.isolating || r > 0 && l ? null : w.findFrom(t, 1), p = f && f.$from.blockRange(f.$to), m = p && kt(p);
	if (m != null && m >= t.depth) return n && n(e.tr.lift(p, m).scrollIntoView()), !0;
	if (u && Hn(o, "start", !0) && Hn(i, "end")) {
		let r = i, s = [];
		for (; s.push(r), !r.isTextblock;) r = r.lastChild;
		let c = o, l = 1;
		for (; !c.isTextblock; c = c.firstChild) l++;
		if (r.canReplace(r.childCount, r.childCount, c.content)) {
			if (n) {
				let r = a.empty;
				for (let e = s.length - 1; e >= 0; e--) r = a.from(s[e].copy(r));
				n(e.tr.step(new C(t.pos - s.length, t.pos + o.nodeSize, t.pos + l, t.pos + o.nodeSize - l, new d(r, s.length, 0), 0, !0)).scrollIntoView());
			}
			return !0;
		}
	}
	return !1;
}
function or(e) {
	return function(t, n) {
		let r = t.selection, i = e < 0 ? r.$from : r.$to, a = i.depth;
		for (; i.node(a).isInline;) {
			if (!a) return !1;
			a--;
		}
		return i.node(a).isTextblock ? (n && n(t.tr.setSelection(T.create(t.doc, e < 0 ? i.start(a) : i.end(a)))), !0) : !1;
	};
}
var sr = or(-1), cr = or(1);
function lr(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a), s = o && jt(o, e, t);
		return s ? (r && r(n.tr.wrap(o, s).scrollIntoView()), !0) : !1;
	};
}
function ur(e, t = null) {
	return function(n, r) {
		let i = !1;
		for (let r = 0; r < n.selection.ranges.length && !i; r++) {
			let { $from: { pos: a }, $to: { pos: o } } = n.selection.ranges[r];
			n.doc.nodesBetween(a, o, (r, a) => {
				if (i) return !1;
				if (!(!r.isTextblock || r.hasMarkup(e, t))) {
					if (r.type == e) i = !0;
					else {
						let t = n.doc.resolve(a), r = t.index();
						i = t.parent.canReplaceWith(r, r + 1, e);
					}
				}
			});
		}
		if (!i) return !1;
		if (r) {
			let i = n.tr;
			for (let r = 0; r < n.selection.ranges.length; r++) {
				let { $from: { pos: a }, $to: { pos: o } } = n.selection.ranges[r];
				i.setBlockType(a, o, e, t);
			}
			r(i.scrollIntoView());
		}
		return !0;
	};
}
function dr(e, t, n, r) {
	for (let i = 0; i < t.length; i++) {
		let { $from: a, $to: o } = t[i], s = a.depth == 0 && e.inlineContent && e.type.allowsMarkType(n);
		if (e.nodesBetween(a.pos, o.pos, (e, t) => {
			if (s || !r && e.isAtom && e.isInline && t >= a.pos && t + e.nodeSize <= o.pos) return !1;
			s = e.inlineContent && e.type.allowsMarkType(n);
		}), s) return !0;
	}
	return !1;
}
function fr(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) {
		let { $from: r, $to: i } = e[n];
		r.doc.nodesBetween(r.pos, i.pos, (e, n) => {
			if (e.isAtom && e.content.size && e.isInline && n >= r.pos && n + e.nodeSize <= i.pos) return n + 1 > r.pos && t.push(new gn(r, r.doc.resolve(n + 1))), r = r.doc.resolve(n + 1 + e.content.size), !1;
		}), r.pos < i.pos && t.push(new gn(r, i));
	}
	return t;
}
function pr(e, t = null, n) {
	let r = (n && n.removeWhenPresent) !== !1, i = (n && n.enterInlineAtoms) !== !1, a = !(n && n.includeWhitespace);
	return function(n, o) {
		let { empty: s, $cursor: c, ranges: l } = n.selection;
		if (s && !c || !dr(n.doc, l, e, i)) return !1;
		if (o) {
			if (c) e.isInSet(n.storedMarks || c.marks()) ? o(n.tr.removeStoredMark(e)) : o(n.tr.addStoredMark(e.create(t)));
			else {
				let s, c = n.tr;
				i || (l = fr(l)), s = r ? !l.some((t) => n.doc.rangeHasMark(t.$from.pos, t.$to.pos, e)) : !l.every((t) => {
					let n = !1;
					return c.doc.nodesBetween(t.$from.pos, t.$to.pos, (r, i, a) => {
						if (n) return !1;
						n = !e.isInSet(r.marks) && !!a && a.type.allowsMarkType(e) && !(r.isText && /^\s*$/.test(r.textBetween(Math.max(0, t.$from.pos - i), Math.min(r.nodeSize, t.$to.pos - i))));
					}), !n;
				});
				for (let n = 0; n < l.length; n++) {
					let { $from: r, $to: i } = l[n];
					if (!s) c.removeMark(r.pos, i.pos, e);
					else {
						let n = r.pos, o = i.pos, s = r.nodeAfter, l = i.nodeBefore, u = a && s && s.isText ? /^\s*/.exec(s.text)[0].length : 0, d = a && l && l.isText ? /\s*$/.exec(l.text)[0].length : 0;
						n + u < o && (n += u, o -= d), c.addMark(n, o, e.create(t));
					}
				}
				o(c.scrollIntoView());
			}
		}
		return !0;
	};
}
function mr(...e) {
	return function(t, n, r) {
		for (let i = 0; i < e.length; i++) if (e[i](t, n, r)) return !0;
		return !1;
	};
}
var hr = mr(zn, Vn, Un), gr = mr(zn, Kn, qn), _r = {
	Enter: mr(Xn, $n, er, nr),
	"Mod-Enter": Qn,
	Backspace: hr,
	"Mod-Backspace": hr,
	"Shift-Backspace": hr,
	Delete: gr,
	"Mod-Delete": gr,
	"Mod-a": rr
}, vr = {
	"Ctrl-h": _r.Backspace,
	"Alt-Backspace": _r["Mod-Backspace"],
	"Ctrl-d": _r.Delete,
	"Ctrl-Alt-Backspace": _r["Mod-Delete"],
	"Alt-Delete": _r["Mod-Delete"],
	"Alt-d": _r["Mod-Delete"],
	"Ctrl-a": sr,
	"Ctrl-e": cr
};
for (let e in _r) vr[e] = _r[e];
var yr = (typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform && os.platform() == "darwin") ? vr : _r;
//#endregion
//#region node_modules/prosemirror-dropcursor/dist/index.js
function br(e = {}) {
	return new Fn({ view(t) {
		return new xr(t, e);
	} });
}
for (var xr = class {
	constructor(e, t) {
		this.editorView = e, this.cursorPos = null, this.element = null, this.timeout = -1, this.lastDragEvent = null, this.width = t.width ?? 1, this.color = t.color === !1 ? void 0 : t.color || "black", this.class = t.class, this.handlers = [
			"dragover",
			"dragend",
			"drop",
			"dragleave"
		].map((t) => {
			let n = (e) => {
				this[t](e);
			};
			return e.dom.addEventListener(t, n), {
				name: t,
				handler: n
			};
		});
	}
	destroy() {
		this.handlers.forEach(({ name: e, handler: t }) => this.editorView.dom.removeEventListener(e, t));
	}
	update(e, t) {
		if (this.cursorPos != null && t.doc != e.state.doc) {
			if (this.lastDragEvent) {
				let e = this.computeTarget(this.lastDragEvent);
				e == this.cursorPos ? this.updateOverlay() : this.setCursor(e);
			} else this.updateOverlay();
		}
	}
	setCursor(e) {
		e != this.cursorPos && (this.cursorPos = e, e == null ? (this.element.parentNode.removeChild(this.element), this.element = null) : this.updateOverlay());
	}
	updateOverlay() {
		let e = this.editorView.state.doc.resolve(this.cursorPos), t = !e.parent.inlineContent, n, r = this.editorView.dom, i = r.getBoundingClientRect(), a = i.width / r.offsetWidth, o = i.height / r.offsetHeight;
		if (t) {
			let t = e.nodeBefore, r = e.nodeAfter;
			if (t || r) {
				let e = this.editorView.nodeDOM(this.cursorPos - (t ? t.nodeSize : 0));
				if (e) {
					let i = e.getBoundingClientRect(), a = t ? i.bottom : i.top;
					t && r && (a = (a + this.editorView.nodeDOM(this.cursorPos).getBoundingClientRect().top) / 2);
					let s = this.width / 2 * o;
					n = {
						left: i.left,
						right: i.right,
						top: a - s,
						bottom: a + s
					};
				}
			}
		}
		if (!n) {
			let e = this.editorView.coordsAtPos(this.cursorPos), t = this.width / 2 * a;
			n = {
				left: e.left - t,
				right: e.left + t,
				top: e.top,
				bottom: e.bottom
			};
		}
		let s = this.editorView.dom.offsetParent;
		this.element || (this.element = s.appendChild(document.createElement("div")), this.class && (this.element.className = this.class), this.element.style.cssText = "position: absolute; z-index: 50; pointer-events: none;", this.color && (this.element.style.backgroundColor = this.color)), this.element.classList.toggle("prosemirror-dropcursor-block", t), this.element.classList.toggle("prosemirror-dropcursor-inline", !t);
		let c, l;
		if (!s || s == document.body && getComputedStyle(s).position == "static") c = -pageXOffset, l = -pageYOffset;
		else {
			let e = s.getBoundingClientRect(), t = e.width / s.offsetWidth, n = e.height / s.offsetHeight;
			c = e.left - s.scrollLeft * t, l = e.top - s.scrollTop * n;
		}
		this.element.style.left = (n.left - c) / a + "px", this.element.style.top = (n.top - l) / o + "px", this.element.style.width = (n.right - n.left) / a + "px", this.element.style.height = (n.bottom - n.top) / o + "px";
	}
	scheduleRemoval(e) {
		clearTimeout(this.timeout), this.timeout = setTimeout(() => this.setCursor(null), e);
	}
	computeTarget(e) {
		let t = this.editorView.posAtCoords({
			left: e.clientX,
			top: e.clientY
		}), n = t && t.inside >= 0 && this.editorView.state.doc.nodeAt(t.inside), r = n && n.type.spec.disableDropCursor, i = typeof r == "function" ? r(this.editorView, t, e) : r;
		if (!t || i) return null;
		let a = t.pos;
		if (this.editorView.dragging && this.editorView.dragging.slice) {
			let e = Jt(this.editorView.state.doc, a, this.editorView.dragging.slice);
			e != null && (a = e);
		}
		return a;
	}
	dragover(e) {
		if (!this.editorView.editable) return;
		this.lastDragEvent = e;
		let t = this.computeTarget(e);
		t != null && (this.setCursor(t), this.scheduleRemoval(5e3));
	}
	dragend() {
		this.scheduleRemoval(20);
	}
	drop() {
		this.scheduleRemoval(20);
	}
	dragleave(e) {
		this.editorView.dom.contains(e.relatedTarget) || this.setCursor(null);
	}
}, Sr = {
	8: "Backspace",
	9: "Tab",
	10: "Enter",
	12: "NumLock",
	13: "Enter",
	16: "Shift",
	17: "Control",
	18: "Alt",
	20: "CapsLock",
	27: "Escape",
	32: " ",
	33: "PageUp",
	34: "PageDown",
	35: "End",
	36: "Home",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown",
	44: "PrintScreen",
	45: "Insert",
	46: "Delete",
	59: ";",
	61: "=",
	91: "Meta",
	92: "Meta",
	106: "*",
	107: "+",
	108: ",",
	109: "-",
	110: ".",
	111: "/",
	144: "NumLock",
	145: "ScrollLock",
	160: "Shift",
	161: "Shift",
	162: "Control",
	163: "Control",
	164: "Alt",
	165: "Alt",
	173: "-",
	186: ";",
	187: "=",
	188: ",",
	189: "-",
	190: ".",
	191: "/",
	192: "`",
	219: "[",
	220: "\\",
	221: "]",
	222: "'"
}, Cr = {
	48: ")",
	49: "!",
	50: "@",
	51: "#",
	52: "$",
	53: "%",
	54: "^",
	55: "&",
	56: "*",
	57: "(",
	59: ":",
	61: "+",
	173: "_",
	186: ":",
	187: "+",
	188: "<",
	189: "_",
	190: ">",
	191: "?",
	192: "~",
	219: "{",
	220: "|",
	221: "}",
	222: "\""
}, wr = typeof navigator < "u" && /Mac/.test(navigator.platform), Tr = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent), D = 0; D < 10; D++) Sr[48 + D] = Sr[96 + D] = String(D);
for (var D = 1; D <= 24; D++) Sr[D + 111] = "F" + D;
for (var D = 65; D <= 90; D++) Sr[D] = String.fromCharCode(D + 32), Cr[D] = String.fromCharCode(D);
for (var Er in Sr) Cr.hasOwnProperty(Er) || (Cr[Er] = Sr[Er]);
function Dr(e) {
	var t = !(wr && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey || Tr && e.shiftKey && e.key && e.key.length == 1 || e.key == "Unidentified") && e.key || (e.shiftKey ? Cr : Sr)[e.keyCode] || e.key || "Unidentified";
	return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
//#endregion
//#region node_modules/prosemirror-keymap/dist/index.js
var Or = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), kr = typeof navigator < "u" && /Win/.test(navigator.platform);
function Ar(e) {
	let t = e.split(/-(?!$)/), n = t[t.length - 1];
	n == "Space" && (n = " ");
	let r, i, a, o;
	for (let e = 0; e < t.length - 1; e++) {
		let n = t[e];
		if (/^(cmd|meta|m)$/i.test(n)) o = !0;
		else if (/^a(lt)?$/i.test(n)) r = !0;
		else if (/^(c|ctrl|control)$/i.test(n)) i = !0;
		else if (/^s(hift)?$/i.test(n)) a = !0;
		else if (/^mod$/i.test(n)) Or ? o = !0 : i = !0;
		else throw Error("Unrecognized modifier name: " + n);
	}
	return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), o && (n = "Meta-" + n), a && (n = "Shift-" + n), n;
}
function jr(e) {
	let t = Object.create(null);
	for (let n in e) t[Ar(n)] = e[n];
	return t;
}
function Mr(e, t, n = !0) {
	return t.altKey && (e = "Alt-" + e), t.ctrlKey && (e = "Ctrl-" + e), t.metaKey && (e = "Meta-" + e), n && t.shiftKey && (e = "Shift-" + e), e;
}
function Nr(e) {
	return new Fn({ props: { handleKeyDown: Pr(e) } });
}
function Pr(e) {
	let t = jr(e);
	return function(e, n) {
		let r = Dr(n), i, a = t[Mr(r, n)];
		if (a && a(e.state, e.dispatch, e)) return !0;
		if (r.length == 1 && r != " ") {
			if (n.shiftKey) {
				let i = t[Mr(r, n, !1)];
				if (i && i(e.state, e.dispatch, e)) return !0;
			}
			if ((n.altKey || n.metaKey || n.ctrlKey) && !(kr && n.ctrlKey && n.altKey) && (i = Sr[n.keyCode]) && i != r) {
				let r = t[Mr(i, n)];
				if (r && r(e.state, e.dispatch, e)) return !0;
			}
		}
		return !1;
	};
}
//#endregion
//#region node_modules/prosemirror-view/dist/index.js
var O = function(e) {
	for (var t = 0;; t++) if (e = e.previousSibling, !e) return t;
}, Fr = function(e) {
	let t = e.assignedSlot || e.parentNode;
	return t && t.nodeType == 11 ? t.host : t;
}, Ir = null, Lr = function(e, t, n) {
	let r = Ir || (Ir = document.createRange());
	return r.setEnd(e, n ?? e.nodeValue.length), r.setStart(e, t || 0), r;
}, Rr = function() {
	Ir = null;
}, zr = function(e, t, n, r) {
	return n && (Vr(e, t, n, r, -1) || Vr(e, t, n, r, 1));
}, Br = /^(img|br|input|textarea|hr)$/i;
function Vr(e, t, n, r, i) {
	for (;;) {
		if (e == n && t == r) return !0;
		if (t == (i < 0 ? 0 : k(e))) {
			let n = e.parentNode;
			if (!n || n.nodeType != 1 || Gr(e) || Br.test(e.nodeName) || e.contentEditable == "false") return !1;
			t = O(e) + (i < 0 ? 0 : 1), e = n;
		} else if (e.nodeType == 1) {
			let n = e.childNodes[t + (i < 0 ? -1 : 0)];
			if (n.nodeType == 1 && n.contentEditable == "false") {
				if (n.pmViewDesc?.ignoreForSelection) t += i;
				else return !1;
			} else e = n, t = i < 0 ? k(e) : 0;
		} else return !1;
	}
}
function k(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function Hr(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t) return e;
		if (e.nodeType == 1 && t > 0) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t - 1], t = k(e);
		} else if (e.parentNode && !Gr(e)) t = O(e), e = e.parentNode;
		else return null;
	}
}
function Ur(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t < e.nodeValue.length) return e;
		if (e.nodeType == 1 && t < e.childNodes.length) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t], t = 0;
		} else if (e.parentNode && !Gr(e)) t = O(e) + 1, e = e.parentNode;
		else return null;
	}
}
function Wr(e, t, n) {
	for (let r = t == 0, i = t == k(e); r || i;) {
		if (e == n) return !0;
		let t = O(e);
		if (e = e.parentNode, !e) return !1;
		r = r && t == 0, i = i && t == k(e);
	}
}
function Gr(e) {
	let t;
	for (let n = e; n && !(t = n.pmViewDesc); n = n.parentNode);
	return t && t.node && t.node.isBlock && (t.dom == e || t.contentDOM == e);
}
var Kr = function(e) {
	return e.focusNode && zr(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset);
};
function qr(e, t) {
	let n = document.createEvent("Event");
	return n.initEvent("keydown", !0, !0), n.keyCode = e, n.key = n.code = t, n;
}
function Jr(e) {
	let t = e.activeElement;
	for (; t && t.shadowRoot;) t = t.shadowRoot.activeElement;
	return t;
}
function Yr(e, t, n) {
	if (e.caretPositionFromPoint) try {
		let r = e.caretPositionFromPoint(t, n);
		if (r) return {
			node: r.offsetNode,
			offset: Math.min(k(r.offsetNode), r.offset)
		};
	} catch {}
	if (e.caretRangeFromPoint) {
		let r = e.caretRangeFromPoint(t, n);
		if (r) return {
			node: r.startContainer,
			offset: Math.min(k(r.startContainer), r.startOffset)
		};
	}
}
var A = typeof navigator < "u" ? navigator : null, Xr = typeof document < "u" ? document : null, Zr = A && A.userAgent || "", Qr = /Edge\/(\d+)/.exec(Zr), $r = /MSIE \d/.exec(Zr), ei = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Zr), j = !!($r || ei || Qr), ti = $r ? document.documentMode : ei ? +ei[1] : Qr ? +Qr[1] : 0, M = !j && /gecko\/(\d+)/i.test(Zr);
M && +(/Firefox\/(\d+)/.exec(Zr) || [0, 0])[1];
var ni = !j && /Chrome\/(\d+)/.exec(Zr), N = !!ni, ri = ni ? +ni[1] : 0, P = !j && !!A && /Apple Computer/.test(A.vendor), ii = P && (/Mobile\/\w+/.test(Zr) || !!A && A.maxTouchPoints > 2), F = ii || (A ? /Mac/.test(A.platform) : !1), ai = A ? /Win/.test(A.platform) : !1, oi = /Android \d/.test(Zr), si = !!Xr && "webkitFontSmoothing" in Xr.documentElement.style, ci = si ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function li(e) {
	let t = e.defaultView && e.defaultView.visualViewport;
	return t ? {
		left: 0,
		right: t.width,
		top: 0,
		bottom: t.height
	} : {
		left: 0,
		right: e.documentElement.clientWidth,
		top: 0,
		bottom: e.documentElement.clientHeight
	};
}
function ui(e, t) {
	return typeof e == "number" ? e : e[t];
}
function di(e) {
	let t = e.getBoundingClientRect(), n = t.width / e.offsetWidth || 1, r = t.height / e.offsetHeight || 1;
	return {
		left: t.left,
		right: t.left + e.clientWidth * n,
		top: t.top,
		bottom: t.top + e.clientHeight * r
	};
}
function fi(e, t, n) {
	if (!Di(t) && t.left == 0) return;
	let r = e.someProp("scrollThreshold") || 0, i = e.someProp("scrollMargin") || 5, a = e.dom.ownerDocument;
	for (let o = n || e.dom; o;) {
		if (o.nodeType != 1) {
			o = Fr(o);
			continue;
		}
		let e = o, n = e == a.body, s = n ? li(a) : di(e), c = 0, l = 0;
		if (t.top < s.top + ui(r, "top") ? l = -(s.top - t.top + ui(i, "top")) : t.bottom > s.bottom - ui(r, "bottom") && (l = t.bottom - t.top > s.bottom - s.top ? t.top + ui(i, "top") - s.top : t.bottom - s.bottom + ui(i, "bottom")), t.left < s.left + ui(r, "left") ? c = -(s.left - t.left + ui(i, "left")) : t.right > s.right - ui(r, "right") && (c = t.right - s.right + ui(i, "right")), c || l) {
			if (n) a.defaultView.scrollBy(c, l);
			else {
				let n = e.scrollLeft, r = e.scrollTop;
				l && (e.scrollTop += l), c && (e.scrollLeft += c);
				let i = e.scrollLeft - n, a = e.scrollTop - r;
				t = {
					left: t.left - i,
					top: t.top - a,
					right: t.right - i,
					bottom: t.bottom - a
				};
			}
		}
		let u = n ? "fixed" : getComputedStyle(o).position;
		if (/^(fixed|sticky)$/.test(u)) break;
		o = u == "absolute" ? o.offsetParent : Fr(o);
	}
}
function pi(e) {
	let t = e.dom.getBoundingClientRect(), n = Math.max(0, t.top), r, i;
	for (let a = (t.left + t.right) / 2, o = n + 1; o < Math.min(innerHeight, t.bottom); o += 5) {
		let t = e.root.elementFromPoint(a, o);
		if (!t || t == e.dom || !e.dom.contains(t)) continue;
		let s = t.getBoundingClientRect();
		if (s.top >= n - 20) {
			r = t, i = s.top;
			break;
		}
	}
	return {
		refDOM: r,
		refTop: i,
		stack: mi(e.dom)
	};
}
function mi(e) {
	let t = [], n = e.ownerDocument;
	for (let r = e; r && (t.push({
		dom: r,
		top: r.scrollTop,
		left: r.scrollLeft
	}), e != n); r = Fr(r));
	return t;
}
function hi({ refDOM: e, refTop: t, stack: n }) {
	let r = e ? e.getBoundingClientRect().top : 0;
	gi(n, r == 0 ? 0 : r - t);
}
function gi(e, t) {
	for (let n = 0; n < e.length; n++) {
		let { dom: r, top: i, left: a } = e[n];
		r.scrollTop != i + t && (r.scrollTop = i + t), r.scrollLeft != a && (r.scrollLeft = a);
	}
}
var _i = null;
function vi(e) {
	if (e.setActive) return e.setActive();
	if (_i) return e.focus(_i);
	let t = mi(e);
	e.focus(_i == null ? { get preventScroll() {
		return _i = { preventScroll: !0 }, !0;
	} } : void 0), _i || (_i = !1, gi(t, 0));
}
function yi(e, t) {
	let n, r = 2e8, i, a = 0, o = t.top, s = t.top, c, l;
	for (let u = e.firstChild, d = 0; u; u = u.nextSibling, d++) {
		let e;
		if (u.nodeType == 1) e = u.getClientRects();
		else if (u.nodeType == 3) e = Lr(u).getClientRects();
		else continue;
		for (let f = 0; f < e.length; f++) {
			let p = e[f];
			if (p.top <= o && p.bottom >= s) {
				o = Math.max(p.bottom, o), s = Math.min(p.top, s);
				let e = p.left > t.left ? p.left - t.left : p.right < t.left ? t.left - p.right : 0;
				if (e < r) {
					n = u, r = e, i = e && n.nodeType == 3 ? {
						left: p.right < t.left ? p.right : p.left,
						top: t.top
					} : t, u.nodeType == 1 && e && (a = d + +(t.left >= (p.left + p.right) / 2));
					continue;
				}
			} else p.top > t.top && !c && p.left <= t.left && p.right >= t.left && (c = u, l = {
				left: Math.max(p.left, Math.min(p.right, t.left)),
				top: p.top
			});
			!n && (t.left >= p.right && t.top >= p.top || t.left >= p.left && t.top >= p.bottom) && (a = d + 1);
		}
	}
	return !n && c && (n = c, i = l, r = 0), n && n.nodeType == 3 ? bi(n, i) : !n || r && n.nodeType == 1 ? {
		node: e,
		offset: a
	} : yi(n, i);
}
function bi(e, t) {
	let n = e.nodeValue.length, r = document.createRange(), i;
	for (let a = 0; a < n; a++) {
		r.setEnd(e, a + 1), r.setStart(e, a);
		let n = Oi(r, 1);
		if (n.top != n.bottom && xi(t, n)) {
			i = {
				node: e,
				offset: a + +(t.left >= (n.left + n.right) / 2)
			};
			break;
		}
	}
	return r.detach(), i || {
		node: e,
		offset: 0
	};
}
function xi(e, t) {
	return e.left >= t.left - 1 && e.left <= t.right + 1 && e.top >= t.top - 1 && e.top <= t.bottom + 1;
}
function Si(e, t) {
	let n = e.parentNode;
	return n && /^li$/i.test(n.nodeName) && t.left < e.getBoundingClientRect().left ? n : e;
}
function Ci(e, t, n) {
	let { node: r, offset: i } = yi(t, n), a = -1;
	if (r.nodeType == 1 && !r.firstChild) {
		let e = r.getBoundingClientRect();
		a = e.left != e.right && n.left > (e.left + e.right) / 2 ? 1 : -1;
	}
	return e.docView.posFromDOM(r, i, a);
}
function wi(e, t, n, r) {
	let i = -1;
	for (let n = t, a = !1; n != e.dom;) {
		let t = e.docView.nearestDesc(n, !0), o;
		if (!t) return null;
		if (t.dom.nodeType == 1 && (t.node.isBlock && t.parent || !t.contentDOM) && ((o = t.dom.getBoundingClientRect()).width || o.height) && (t.node.isBlock && t.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(t.dom.nodeName) && (!a && o.left > r.left || o.top > r.top ? i = t.posBefore : (!a && o.right < r.left || o.bottom < r.top) && (i = t.posAfter), a = !0), !t.contentDOM && i < 0 && !t.node.isText)) return (t.node.isBlock ? r.top < (o.top + o.bottom) / 2 : r.left < (o.left + o.right) / 2) ? t.posBefore : t.posAfter;
		n = t.dom.parentNode;
	}
	return i > -1 ? i : e.docView.posFromDOM(t, n, -1);
}
function Ti(e, t, n) {
	let r = e.childNodes.length;
	if (r && n.top < n.bottom) for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (t.top - n.top) / (n.bottom - n.top)) - 2)), a = i;;) {
		let n = e.childNodes[a];
		if (n.nodeType == 1) {
			let e = n.getClientRects();
			for (let r = 0; r < e.length; r++) {
				let i = e[r];
				if (xi(t, i)) return Ti(n, t, i);
			}
		}
		if ((a = (a + 1) % r) == i) break;
	}
	return e;
}
function Ei(e, t) {
	let n = e.dom.ownerDocument, r, i = 0, a = Yr(n, t.left, t.top);
	a && ({node: r, offset: i} = a);
	let o = (e.root.elementFromPoint ? e.root : n).elementFromPoint(t.left, t.top), s;
	if (!o || !e.dom.contains(o.nodeType == 1 ? o : o.parentNode)) {
		let n = e.dom.getBoundingClientRect();
		if (!xi(t, n) || (o = Ti(e.dom, t, n), !o)) return null;
	}
	if (P) for (let e = o; r && e; e = Fr(e)) e.draggable && (r = void 0);
	if (o = Si(o, t), r) {
		if (M && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
			let e = r.childNodes[i], n;
			e.nodeName == "IMG" && (n = e.getBoundingClientRect()).right <= t.left && n.bottom > t.top && i++;
		}
		let n;
		si && i && r.nodeType == 1 && (n = r.childNodes[i - 1]).nodeType == 1 && n.contentEditable == "false" && n.getBoundingClientRect().top >= t.top && i--, r == e.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && t.top > r.lastChild.getBoundingClientRect().bottom ? s = e.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (s = wi(e, r, i, t));
	}
	s ?? (s = Ci(e, o, t));
	let c = e.docView.nearestDesc(o, !0);
	return {
		pos: s,
		inside: c ? c.posAtStart - c.border : -1
	};
}
function Di(e) {
	return e.top < e.bottom || e.left < e.right;
}
function Oi(e, t) {
	let n = e.getClientRects();
	if (n.length) {
		let e = n[t < 0 ? 0 : n.length - 1];
		if (Di(e)) return e;
	}
	return Array.prototype.find.call(n, Di) || e.getBoundingClientRect();
}
var ki = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Ai(e, t, n) {
	let { node: r, offset: i, atom: a } = e.docView.domFromPos(t, n < 0 ? -1 : 1), o = si || M;
	if (r.nodeType == 3) {
		if (o && (ki.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
			let e = Oi(Lr(r, i, i), n);
			if (M && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
				let t = Oi(Lr(r, i - 1, i - 1), -1);
				if (t.top == e.top) {
					let n = Oi(Lr(r, i, i + 1), -1);
					if (n.top != e.top) return ji(n, n.left < t.left);
				}
			}
			return e;
		}
		{
			let e = i, t = i, a = n < 0 ? 1 : -1;
			return n < 0 && !i ? (t++, a = -1) : n >= 0 && i == r.nodeValue.length ? (e--, a = 1) : n < 0 ? e-- : t++, ji(Oi(Lr(r, e, t), a), a < 0);
		}
	}
	if (!e.state.doc.resolve(t - (a || 0)).parent.inlineContent) {
		if (a == null && i && (n < 0 || i == k(r))) {
			let e = r.childNodes[i - 1];
			if (e.nodeType == 1) return Mi(e.getBoundingClientRect(), !1);
		}
		if (a == null && i < k(r)) {
			let e = r.childNodes[i];
			if (e.nodeType == 1) return Mi(e.getBoundingClientRect(), !0);
		}
		return Mi(r.getBoundingClientRect(), n >= 0);
	}
	if (a == null && i && (n < 0 || i == k(r))) {
		let e = r.childNodes[i - 1], t = e.nodeType == 3 ? Lr(e, k(e) - +!o) : e.nodeType == 1 && (e.nodeName != "BR" || !e.nextSibling) ? e : null;
		if (t) return ji(Oi(t, 1), !1);
	}
	if (a == null && i < k(r)) {
		let e = r.childNodes[i];
		for (; e.pmViewDesc && e.pmViewDesc.ignoreForCoords;) e = e.nextSibling;
		let t = e ? e.nodeType == 3 ? Lr(e, 0, +!o) : e.nodeType == 1 ? e : null : null;
		if (t) return ji(Oi(t, -1), !0);
	}
	return ji(Oi(r.nodeType == 3 ? Lr(r) : r, -n), n >= 0);
}
function ji(e, t) {
	if (e.width == 0) return e;
	let n = t ? e.left : e.right;
	return {
		top: e.top,
		bottom: e.bottom,
		left: n,
		right: n
	};
}
function Mi(e, t) {
	if (e.height == 0) return e;
	let n = t ? e.top : e.bottom;
	return {
		top: n,
		bottom: n,
		left: e.left,
		right: e.right
	};
}
function Ni(e, t, n) {
	let r = e.state, i = e.root.activeElement;
	r != t && e.updateState(t), i != e.dom && e.focus();
	try {
		return n();
	} finally {
		r != t && e.updateState(r), i != e.dom && i && i.focus();
	}
}
function Pi(e, t, n) {
	let r = t.selection, i = n == "up" ? r.$from : r.$to;
	return Ni(e, t, () => {
		let { node: t } = e.docView.domFromPos(i.pos, n == "up" ? -1 : 1);
		for (;;) {
			let n = e.docView.nearestDesc(t, !0);
			if (!n) break;
			if (n.node.isBlock) {
				t = n.contentDOM || n.dom;
				break;
			}
			t = n.dom.parentNode;
		}
		let r = Ai(e, i.pos, 1);
		for (let e = t.firstChild; e; e = e.nextSibling) {
			let t;
			if (e.nodeType == 1) t = e.getClientRects();
			else if (e.nodeType == 3) t = Lr(e, 0, e.nodeValue.length).getClientRects();
			else continue;
			for (let e = 0; e < t.length; e++) {
				let i = t[e];
				if (i.bottom > i.top + 1 && (n == "up" ? r.top - i.top > (i.bottom - r.top) * 2 : i.bottom - r.bottom > (r.bottom - i.top) * 2)) return !1;
			}
		}
		return !0;
	});
}
var Fi = /[\u0590-\u08ac]/;
function Ii(e, t, n) {
	let { $head: r } = t.selection;
	if (!r.parent.isTextblock) return !1;
	let i = r.parentOffset, a = !i, o = i == r.parent.content.size, s = e.domSelection();
	return s ? !Fi.test(r.parent.textContent) || !s.modify ? n == "left" || n == "backward" ? a : o : Ni(e, t, () => {
		let { focusNode: t, focusOffset: i, anchorNode: a, anchorOffset: o } = e.domSelectionRange(), c = s.caretBidiLevel;
		s.modify("move", n, "character");
		let l = r.depth ? e.docView.domAfterPos(r.before()) : e.dom, { focusNode: u, focusOffset: d } = e.domSelectionRange(), f = u && !l.contains(u.nodeType == 1 ? u : u.parentNode) || t == u && i == d;
		try {
			s.collapse(a, o), t && (t != a || i != o) && s.extend && s.extend(t, i);
		} catch {}
		return c != null && (s.caretBidiLevel = c), f;
	}) : r.pos == r.start() || r.pos == r.end();
}
var Li = null, Ri = null, zi = !1;
function Bi(e, t, n) {
	return Li == t && Ri == n ? zi : (Li = t, Ri = n, zi = n == "up" || n == "down" ? Pi(e, t, n) : Ii(e, t, n));
}
var I = 0, Vi = 1, Hi = 2, L = 3, Ui = class {
	constructor(e, t, n, r) {
		this.parent = e, this.children = t, this.dom = n, this.contentDOM = r, this.dirty = I, n.pmViewDesc = this;
	}
	matchesWidget(e) {
		return !1;
	}
	matchesMark(e) {
		return !1;
	}
	matchesNode(e, t, n) {
		return !1;
	}
	matchesHack(e) {
		return !1;
	}
	parseRule(e) {
		return null;
	}
	stopEvent(e) {
		return !1;
	}
	get size() {
		let e = 0;
		for (let t = 0; t < this.children.length; t++) e += this.children[t].size;
		return e;
	}
	get border() {
		return 0;
	}
	destroy() {
		this.parent = void 0, this.dom.pmViewDesc == this && (this.dom.pmViewDesc = void 0);
		for (let e = 0; e < this.children.length; e++) this.children[e].destroy();
	}
	posBeforeChild(e) {
		for (let t = 0, n = this.posAtStart;; t++) {
			let r = this.children[t];
			if (r == e) return n;
			n += r.size;
		}
	}
	get posBefore() {
		return this.parent.posBeforeChild(this);
	}
	get posAtStart() {
		return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
	}
	get posAfter() {
		return this.posBefore + this.size;
	}
	get posAtEnd() {
		return this.posAtStart + this.size - 2 * this.border;
	}
	localPosFromDOM(e, t, n) {
		if (this.contentDOM && this.contentDOM.contains(e.nodeType == 1 ? e : e.parentNode)) {
			if (n < 0) {
				let n, r;
				if (e == this.contentDOM) n = e.childNodes[t - 1];
				else {
					for (; e.parentNode != this.contentDOM;) e = e.parentNode;
					n = e.previousSibling;
				}
				for (; n && !((r = n.pmViewDesc) && r.parent == this);) n = n.previousSibling;
				return n ? this.posBeforeChild(r) + r.size : this.posAtStart;
			}
			{
				let n, r;
				if (e == this.contentDOM) n = e.childNodes[t];
				else {
					for (; e.parentNode != this.contentDOM;) e = e.parentNode;
					n = e.nextSibling;
				}
				for (; n && !((r = n.pmViewDesc) && r.parent == this);) n = n.nextSibling;
				return n ? this.posBeforeChild(r) : this.posAtEnd;
			}
		}
		let r;
		if (e == this.dom && this.contentDOM) r = t > O(this.contentDOM);
		else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) r = e.compareDocumentPosition(this.contentDOM) & 2;
		else if (this.dom.firstChild) {
			if (t == 0) for (let t = e;; t = t.parentNode) {
				if (t == this.dom) {
					r = !1;
					break;
				}
				if (t.previousSibling) break;
			}
			if (r == null && t == e.childNodes.length) for (let t = e;; t = t.parentNode) {
				if (t == this.dom) {
					r = !0;
					break;
				}
				if (t.nextSibling) break;
			}
		}
		return r ?? n > 0 ? this.posAtEnd : this.posAtStart;
	}
	nearestDesc(e, t = !1) {
		for (let n = !0, r = e; r; r = r.parentNode) {
			let i = this.getDesc(r), a;
			if (i && (!t || i.node)) {
				if (n && (a = i.nodeDOM) && !(a.nodeType == 1 ? a.contains(e.nodeType == 1 ? e : e.parentNode) : a == e)) n = !1;
				else return i;
			}
		}
	}
	getDesc(e) {
		let t = e.pmViewDesc;
		for (let e = t; e; e = e.parent) if (e == this) return t;
	}
	posFromDOM(e, t, n) {
		for (let r = e; r; r = r.parentNode) {
			let i = this.getDesc(r);
			if (i) return i.localPosFromDOM(e, t, n);
		}
		return -1;
	}
	descAt(e) {
		for (let t = 0, n = 0; t < this.children.length; t++) {
			let r = this.children[t], i = n + r.size;
			if (n == e && i != n) {
				for (; !r.border && r.children.length;) for (let e = 0; e < r.children.length; e++) {
					let t = r.children[e];
					if (t.size) {
						r = t;
						break;
					}
				}
				return r;
			}
			if (e < i) return r.descAt(e - n - r.border);
			n = i;
		}
	}
	domFromPos(e, t) {
		if (!this.contentDOM) return {
			node: this.dom,
			offset: 0,
			atom: e + 1
		};
		let n = 0, r = 0;
		for (let t = 0; n < this.children.length; n++) {
			let i = this.children[n], a = t + i.size;
			if (a > e || i instanceof Xi) {
				r = e - t;
				break;
			}
			t = a;
		}
		if (r) return this.children[n].domFromPos(r - this.children[n].border, t);
		for (let e; n && !(e = this.children[n - 1]).size && e instanceof Wi && e.side >= 0; n--);
		if (t <= 0) {
			let e, r = !0;
			for (; e = n ? this.children[n - 1] : null, !(!e || e.dom.parentNode == this.contentDOM); n--, r = !1);
			return e && t && r && !e.border && !e.domAtom ? e.domFromPos(e.size, t) : {
				node: this.contentDOM,
				offset: e ? O(e.dom) + 1 : 0
			};
		}
		{
			let e, r = !0;
			for (; e = n < this.children.length ? this.children[n] : null, !(!e || e.dom.parentNode == this.contentDOM); n++, r = !1);
			return e && r && !e.border && !e.domAtom ? e.domFromPos(0, t) : {
				node: this.contentDOM,
				offset: e ? O(e.dom) : this.contentDOM.childNodes.length
			};
		}
	}
	parseRange(e, t, n = 0) {
		if (this.children.length == 0) return {
			node: this.contentDOM,
			from: e,
			to: t,
			fromOffset: 0,
			toOffset: this.contentDOM.childNodes.length
		};
		let r = -1, i = -1;
		for (let a = n, o = 0;; o++) {
			let n = this.children[o], s = a + n.size;
			if (r == -1 && e <= s) {
				let i = a + n.border;
				if (e >= i && t <= s - n.border && n.node && n.contentDOM && this.contentDOM.contains(n.contentDOM)) return n.parseRange(e, t, i);
				e = a;
				for (let t = o; t > 0; t--) {
					let n = this.children[t - 1];
					if (n.size && n.dom.parentNode == this.contentDOM && !n.emptyChildAt(1)) {
						r = O(n.dom) + 1;
						break;
					}
					e -= n.size;
				}
				r == -1 && (r = 0);
			}
			if (r > -1 && (s > t || o == this.children.length - 1)) {
				t = s;
				for (let e = o + 1; e < this.children.length; e++) {
					let n = this.children[e];
					if (n.size && n.dom.parentNode == this.contentDOM && !n.emptyChildAt(-1)) {
						i = O(n.dom);
						break;
					}
					t += n.size;
				}
				i == -1 && (i = this.contentDOM.childNodes.length);
				break;
			}
			a = s;
		}
		return {
			node: this.contentDOM,
			from: e,
			to: t,
			fromOffset: r,
			toOffset: i
		};
	}
	emptyChildAt(e) {
		if (this.border || !this.contentDOM || !this.children.length) return !1;
		let t = this.children[e < 0 ? 0 : this.children.length - 1];
		return t.size == 0 || t.emptyChildAt(e);
	}
	domAfterPos(e) {
		let { node: t, offset: n } = this.domFromPos(e, 0);
		if (t.nodeType != 1 || n == t.childNodes.length) throw RangeError("No node after pos " + e);
		return t.childNodes[n];
	}
	setSelection(e, t, n, r = !1) {
		let i = Math.min(e, t), a = Math.max(e, t);
		for (let o = 0, s = 0; o < this.children.length; o++) {
			let c = this.children[o], l = s + c.size;
			if (i > s && a < l) return c.setSelection(e - s - c.border, t - s - c.border, n, r);
			s = l;
		}
		let o = this.domFromPos(e, e ? -1 : 1), s = t == e ? o : this.domFromPos(t, t ? -1 : 1), c = n.root.getSelection(), l = n.domSelectionRange(), u = !1;
		if ((M || P) && e == t) {
			let { node: e, offset: t } = o;
			if (e.nodeType == 3) {
				if (u = !!(t && e.nodeValue[t - 1] == "\n"), u && t == e.nodeValue.length) for (let t = e, n; t; t = t.parentNode) {
					if (n = t.nextSibling) {
						n.nodeName == "BR" && (o = s = {
							node: n.parentNode,
							offset: O(n) + 1
						});
						break;
					}
					let e = t.pmViewDesc;
					if (e && e.node && e.node.isBlock) break;
				}
			} else {
				let n = e.childNodes[t - 1];
				u = n && (n.nodeName == "BR" || n.contentEditable == "false");
			}
		}
		if (M && l.focusNode && l.focusNode != s.node && l.focusNode.nodeType == 1) {
			let e = l.focusNode.childNodes[l.focusOffset];
			e && e.contentEditable == "false" && (r = !0);
		}
		if (!(r || u && P) && zr(o.node, o.offset, l.anchorNode, l.anchorOffset) && zr(s.node, s.offset, l.focusNode, l.focusOffset)) return;
		let d = !1;
		if ((c.extend || e == t) && !(u && M)) {
			c.collapse(o.node, o.offset);
			try {
				e != t && c.extend(s.node, s.offset), d = !0;
			} catch {}
		}
		if (!d) {
			if (e > t) {
				let e = o;
				o = s, s = e;
			}
			let n = document.createRange();
			n.setEnd(s.node, s.offset), n.setStart(o.node, o.offset), c.removeAllRanges(), c.addRange(n);
		}
	}
	ignoreMutation(e) {
		return !this.contentDOM && e.type != "selection";
	}
	get contentLost() {
		return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
	}
	markDirty(e, t) {
		for (let n = 0, r = 0; r < this.children.length; r++) {
			let i = this.children[r], a = n + i.size;
			if (n == a ? e <= a && t >= n : e < a && t > n) {
				let r = n + i.border, o = a - i.border;
				if (e >= r && t <= o) {
					this.dirty = e == n || t == a ? Hi : Vi, e == r && t == o && (i.contentLost || i.dom.parentNode != this.contentDOM) ? i.dirty = L : i.markDirty(e - r, t - r);
					return;
				}
				i.dirty = i.dom == i.contentDOM && i.dom.parentNode == this.contentDOM && !i.children.length ? Hi : L;
			}
			n = a;
		}
		this.dirty = Hi;
	}
	markParentsDirty() {
		let e = 1;
		for (let t = this.parent; t; t = t.parent, e++) {
			let n = e == 1 ? Hi : Vi;
			t.dirty < n && (t.dirty = n);
		}
	}
	get domAtom() {
		return !1;
	}
	get ignoreForCoords() {
		return !1;
	}
	get ignoreForSelection() {
		return !1;
	}
	isText(e) {
		return !1;
	}
}, Wi = class extends Ui {
	constructor(e, t, n, r) {
		let i, a = t.type.toDOM;
		if (typeof a == "function" && (a = a(n, () => {
			if (!i) return r;
			if (i.parent) return i.parent.posBeforeChild(i);
		})), !t.type.spec.raw) {
			if (a.nodeType != 1) {
				let e = document.createElement("span");
				e.appendChild(a), a = e;
			}
			a.hasAttribute("contenteditable") || (a.contentEditable = "false"), a.classList.add("ProseMirror-widget");
		}
		super(e, [], a, null), this.widget = t, this.widget = t, i = this;
	}
	matchesWidget(e) {
		return this.dirty == I && e.type.eq(this.widget.type);
	}
	parseRule() {
		return { ignore: !0 };
	}
	stopEvent(e) {
		let t = this.widget.spec.stopEvent;
		return t ? t(e) : !1;
	}
	ignoreMutation(e) {
		return e.type != "selection" || this.widget.spec.ignoreSelection;
	}
	destroy() {
		this.widget.type.destroy(this.dom), super.destroy();
	}
	get domAtom() {
		return !0;
	}
	get ignoreForSelection() {
		return !!this.widget.type.spec.relaxedSide;
	}
	get side() {
		return this.widget.type.side;
	}
}, Gi = class extends Ui {
	constructor(e, t, n, r) {
		super(e, [], t, null), this.textDOM = n, this.text = r;
	}
	get size() {
		return this.text.length;
	}
	localPosFromDOM(e, t) {
		return e == this.textDOM ? this.posAtStart + t : this.posAtStart + (t ? this.size : 0);
	}
	domFromPos(e) {
		return {
			node: this.textDOM,
			offset: e
		};
	}
	ignoreMutation(e) {
		return e.type === "characterData" && e.target.nodeValue == e.oldValue;
	}
}, Ki = class e extends Ui {
	constructor(e, t, n, r, i) {
		super(e, [], n, r), this.mark = t, this.spec = i;
	}
	static create(t, n, r, i) {
		let a = i.nodeViews[n.type.name], o = a && a(n, i, r);
		return (!o || !o.dom) && (o = Qe.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new e(t, n, o.dom, o.contentDOM || o.dom, o);
	}
	parseRule() {
		return this.dirty & L || this.mark.type.spec.reparseInView ? null : {
			mark: this.mark.type.name,
			attrs: this.mark.attrs,
			contentElement: this.contentDOM
		};
	}
	matchesMark(e) {
		return this.dirty != L && this.mark.eq(e);
	}
	markDirty(e, t) {
		if (super.markDirty(e, t), this.dirty != I) {
			let e = this.parent;
			for (; !e.node;) e = e.parent;
			e.dirty < this.dirty && (e.dirty = this.dirty), this.dirty = I;
		}
	}
	slice(t, n, r) {
		let i = e.create(this.parent, this.mark, !0, r), a = this.children, o = this.size;
		n < o && (a = pa(a, n, o, r)), t > 0 && (a = pa(a, 0, t, r));
		for (let e = 0; e < a.length; e++) a[e].parent = i;
		return i.children = a, i;
	}
	ignoreMutation(e) {
		return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
	}
	destroy() {
		this.spec.destroy && this.spec.destroy(), super.destroy();
	}
}, qi = class e extends Ui {
	constructor(e, t, n, r, i, a, o) {
		super(e, [], i, a), this.node = t, this.outerDeco = n, this.innerDeco = r, this.nodeDOM = o;
	}
	static create(t, n, r, i, a, o) {
		let s = a.nodeViews[n.type.name], c, l = s && s(n, a, () => {
			if (!c) return o;
			if (c.parent) return c.parent.posBeforeChild(c);
		}, r, i), u = l && l.dom, d = l && l.contentDOM;
		if (n.isText) {
			if (!u) u = document.createTextNode(n.text);
			else if (u.nodeType != 3) throw RangeError("Text must be rendered as a DOM text node");
		} else if (!u) {
			let e = Qe.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs);
			({dom: u, contentDOM: d} = e);
		}
		!d && !n.isText && u.nodeName != "BR" && (u.hasAttribute("contenteditable") || (u.contentEditable = "false"), n.type.spec.draggable && (u.draggable = !0));
		let f = u;
		return u = ia(u, r, n), l ? c = new Zi(t, n, r, i, u, d || null, f, l) : n.isText ? new Yi(t, n, r, i, u, f) : new e(t, n, r, i, u, d || null, f);
	}
	parseRule(e) {
		if (this.node.type.spec.reparseInView) return null;
		let t = {
			node: this.node.type.name,
			attrs: this.node.attrs
		};
		if (this.node.type.whitespace == "pre" && (t.preserveWhitespace = "full"), !this.contentDOM) t.getContent = () => this.node.content;
		else if (!this.contentLost) t.contentElement = this.contentDOM;
		else {
			for (let e = this.children.length - 1; e >= 0; e--) {
				let n = this.children[e];
				if (this.dom.contains(n.dom.parentNode)) {
					t.contentElement = n.dom.parentNode;
					break;
				}
			}
			if (!t.contentElement) {
				let n = e && e.find((t) => t.nodeType == 1 && e.indexOf(t.parentNode) < 0 && this.dom.contains(t));
				n ? t.contentElement = n : t.getContent = () => a.empty;
			}
		}
		return t;
	}
	matchesNode(e, t, n) {
		return this.dirty == I && e.eq(this.node) && aa(t, this.outerDeco) && n.eq(this.innerDeco);
	}
	get size() {
		return this.node.nodeSize;
	}
	get border() {
		return +!this.node.isLeaf;
	}
	updateChildren(e, t) {
		let n = this.node.inlineContent, r = t, i = e.composing ? this.localCompositionInfo(e, t) : null, a = i && i.pos > -1 ? i : null, o = i && i.pos < 0, s = new sa(this, a && a.node, e);
		ua(this.node, this.innerDeco, (t, i, a) => {
			t.spec.marks ? s.syncToMarks(t.spec.marks, n, e, i) : t.type.side >= 0 && !a && s.syncToMarks(i == this.node.childCount ? l.none : this.node.child(i).marks, n, e, i), s.placeWidget(t, e, r);
		}, (t, a, c, l) => {
			s.syncToMarks(t.marks, n, e, l);
			let u;
			s.findNodeMatch(t, a, c, l) || o && e.state.selection.from > r && e.state.selection.to < r + t.nodeSize && (u = s.findIndexWithChild(i.node)) > -1 && s.updateNodeAt(t, a, c, u, e) || s.updateNextNode(t, a, c, e, l, r) || s.addNode(t, a, c, e, r), r += t.nodeSize;
		}), s.syncToMarks([], n, e, 0), this.node.isTextblock && s.addTextblockHacks(), s.destroyRest(), (s.changed || this.dirty == Hi) && (a && this.protectLocalComposition(e, a), Qi(this.contentDOM, this.children, e), ii && da(this.dom));
	}
	localCompositionInfo(e, t) {
		let { from: n, to: r } = e.state.selection;
		if (!(e.state.selection instanceof T) || n < t || r > t + this.node.content.size) return null;
		let i = e.input.compositionNode;
		if (!i || !this.dom.contains(i.parentNode)) return null;
		if (this.node.inlineContent) {
			let e = i.nodeValue, a = fa(this.node.content, e, n - t, r - t);
			return a < 0 ? null : {
				node: i,
				pos: a,
				text: e
			};
		}
		return {
			node: i,
			pos: -1,
			text: ""
		};
	}
	protectLocalComposition(e, { node: t, pos: n, text: r }) {
		if (this.getDesc(t)) return;
		let i = t;
		for (; i.parentNode != this.contentDOM; i = i.parentNode) {
			for (; i.previousSibling;) i.parentNode.removeChild(i.previousSibling);
			for (; i.nextSibling;) i.parentNode.removeChild(i.nextSibling);
			i.pmViewDesc && (i.pmViewDesc = void 0);
		}
		let a = new Gi(this, i, t, r);
		e.input.compositionNodes.push(a), this.children = pa(this.children, n, n + r.length, e, a);
	}
	update(e, t, n, r) {
		return this.dirty == L || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, t, n, r), !0);
	}
	updateInner(e, t, n, r) {
		this.updateOuterDeco(t), this.node = e, this.innerDeco = n, this.contentDOM && this.updateChildren(r, this.posAtStart), this.dirty = I;
	}
	updateOuterDeco(e) {
		if (aa(e, this.outerDeco)) return;
		let t = this.nodeDOM.nodeType != 1, n = this.dom;
		this.dom = na(this.dom, this.nodeDOM, ta(this.outerDeco, this.node, t), ta(e, this.node, t)), this.dom != n && (n.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
	}
	selectNode() {
		this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.add("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && (this.nodeDOM.draggable = !0));
	}
	deselectNode() {
		this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.remove("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && this.nodeDOM.removeAttribute("draggable"));
	}
	get domAtom() {
		return this.node.isAtom;
	}
};
function Ji(e, t, n, r, i) {
	ia(r, t, e);
	let a = new qi(void 0, e, t, n, r, r, r);
	return a.contentDOM && a.updateChildren(i, 0), a;
}
var Yi = class e extends qi {
	constructor(e, t, n, r, i, a) {
		super(e, t, n, r, i, null, a);
	}
	parseRule() {
		let e = this.nodeDOM.parentNode;
		for (; e && e != this.dom && !e.pmIsDeco;) e = e.parentNode;
		return { skip: e || !0 };
	}
	update(e, t, n, r) {
		return this.dirty == L || this.dirty != I && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(t), (this.dirty != I || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, r.trackWrites == this.nodeDOM && (r.trackWrites = null)), this.node = e, this.dirty = I, !0);
	}
	inParent() {
		let e = this.parent.contentDOM;
		for (let t = this.nodeDOM; t; t = t.parentNode) if (t == e) return !0;
		return !1;
	}
	domFromPos(e) {
		return {
			node: this.nodeDOM,
			offset: e
		};
	}
	localPosFromDOM(e, t, n) {
		return e == this.nodeDOM ? this.posAtStart + Math.min(t, this.node.text.length) : super.localPosFromDOM(e, t, n);
	}
	ignoreMutation(e) {
		return e.type != "characterData" && e.type != "selection";
	}
	slice(t, n, r) {
		let i = this.node.cut(t, n), a = document.createTextNode(i.text);
		return new e(this.parent, i, this.outerDeco, this.innerDeco, a, a);
	}
	markDirty(e, t) {
		super.markDirty(e, t), this.dom != this.nodeDOM && (e == 0 || t == this.nodeDOM.nodeValue.length) && (this.dirty = L);
	}
	get domAtom() {
		return !1;
	}
	isText(e) {
		return this.node.text == e;
	}
}, Xi = class extends Ui {
	parseRule() {
		return { ignore: !0 };
	}
	matchesHack(e) {
		return this.dirty == I && this.dom.nodeName == e;
	}
	get domAtom() {
		return !0;
	}
	get ignoreForCoords() {
		return this.dom.nodeName == "IMG";
	}
}, Zi = class extends qi {
	constructor(e, t, n, r, i, a, o, s) {
		super(e, t, n, r, i, a, o), this.spec = s;
	}
	update(e, t, n, r) {
		if (this.dirty == L) return !1;
		if (this.spec.update && (this.node.type == e.type || this.spec.multiType)) {
			let i = this.spec.update(e, t, n);
			return i && this.updateInner(e, t, n, r), i;
		}
		return !this.contentDOM && !e.isLeaf ? !1 : super.update(e, t, n, r);
	}
	selectNode() {
		this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
	}
	deselectNode() {
		this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
	}
	setSelection(e, t, n, r) {
		this.spec.setSelection ? this.spec.setSelection(e, t, n.root) : super.setSelection(e, t, n, r);
	}
	destroy() {
		this.spec.destroy && this.spec.destroy(), super.destroy();
	}
	stopEvent(e) {
		return this.spec.stopEvent ? this.spec.stopEvent(e) : !1;
	}
	ignoreMutation(e) {
		return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
	}
};
function Qi(e, t, n) {
	let r = e.firstChild, i = !1;
	for (let a = 0; a < t.length; a++) {
		let o = t[a], s = o.dom;
		if (s.parentNode == e) {
			for (; s != r;) r = oa(r), i = !0;
			r = r.nextSibling;
		} else i = !0, e.insertBefore(s, r);
		if (o instanceof Ki) {
			let t = r ? r.previousSibling : e.lastChild;
			Qi(o.contentDOM, o.children, n), r = t ? t.nextSibling : e.firstChild;
		}
	}
	for (; r;) r = oa(r), i = !0;
	i && n.trackWrites == e && (n.trackWrites = null);
}
var $i = function(e) {
	e && (this.nodeName = e);
};
$i.prototype = Object.create(null);
var ea = [new $i()];
function ta(e, t, n) {
	if (e.length == 0) return ea;
	let r = n ? ea[0] : new $i(), i = [r];
	for (let a = 0; a < e.length; a++) {
		let o = e[a].type.attrs;
		if (o) {
			o.nodeName && i.push(r = new $i(o.nodeName));
			for (let e in o) {
				let a = o[e];
				a != null && (n && i.length == 1 && i.push(r = new $i(t.isInline ? "span" : "div")), e == "class" ? r.class = (r.class ? r.class + " " : "") + a : e == "style" ? r.style = (r.style ? r.style + ";" : "") + a : e != "nodeName" && (r[e] = a));
			}
		}
	}
	return i;
}
function na(e, t, n, r) {
	if (n == ea && r == ea) return t;
	let i = t;
	for (let t = 0; t < r.length; t++) {
		let a = r[t], o = n[t];
		if (t) {
			let t;
			o && o.nodeName == a.nodeName && i != e && (t = i.parentNode) && t.nodeName.toLowerCase() == a.nodeName ? i = t : (t = document.createElement(a.nodeName), t.pmIsDeco = !0, t.appendChild(i), o = ea[0], i = t);
		}
		ra(i, o || ea[0], a);
	}
	return i;
}
function ra(e, t, n) {
	for (let r in t) r != "class" && r != "style" && r != "nodeName" && !(r in n) && e.removeAttribute(r);
	for (let r in n) r != "class" && r != "style" && r != "nodeName" && n[r] != t[r] && e.setAttribute(r, n[r]);
	if (t.class != n.class) {
		let r = t.class ? t.class.split(" ").filter(Boolean) : [], i = n.class ? n.class.split(" ").filter(Boolean) : [];
		for (let t = 0; t < r.length; t++) i.indexOf(r[t]) == -1 && e.classList.remove(r[t]);
		for (let t = 0; t < i.length; t++) r.indexOf(i[t]) == -1 && e.classList.add(i[t]);
		e.classList.length == 0 && e.removeAttribute("class");
	}
	if (t.style != n.style) {
		if (t.style) {
			let n = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, r;
			for (; r = n.exec(t.style);) e.style.removeProperty(r[1]);
		}
		n.style && (e.style.cssText += n.style);
	}
}
function ia(e, t, n) {
	return na(e, e, ea, ta(t, n, e.nodeType != 1));
}
function aa(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (!e[n].type.eq(t[n].type)) return !1;
	return !0;
}
function oa(e) {
	let t = e.nextSibling;
	return e.parentNode.removeChild(e), t;
}
var sa = class {
	constructor(e, t, n) {
		this.lock = t, this.view = n, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = ca(e.node.content, e);
	}
	destroyBetween(e, t) {
		if (e != t) {
			for (let n = e; n < t; n++) this.top.children[n].destroy();
			this.top.children.splice(e, t - e), this.changed = !0;
		}
	}
	destroyRest() {
		this.destroyBetween(this.index, this.top.children.length);
	}
	syncToMarks(e, t, n, r) {
		let i = 0, a = this.stack.length >> 1, o = Math.min(a, e.length);
		for (; i < o && (i == a - 1 ? this.top : this.stack[i + 1 << 1]).matchesMark(e[i]) && e[i].type.spec.spanning !== !1;) i++;
		for (; i < a;) this.destroyRest(), this.top.dirty = I, this.index = this.stack.pop(), this.top = this.stack.pop(), a--;
		for (; a < e.length;) {
			this.stack.push(this.top, this.index + 1);
			let i = -1, o = this.top.children.length;
			r < this.preMatch.index && (o = Math.min(this.index + 3, o));
			for (let t = this.index; t < o; t++) {
				let n = this.top.children[t];
				if (n.matchesMark(e[a]) && !this.isLocked(n.dom)) {
					i = t;
					break;
				}
			}
			if (i < 0 && this.index < this.top.children.length) {
				let t = this.top.children[this.index];
				t instanceof Ki && t.dirty != L && t.mark.type == e[a].type && t.spec.update && !this.isLocked(t.dom) && t.spec.update(e[a]) && (t.mark = e[a], i = this.index, this.changed = !0);
			}
			if (i > -1) i > this.index && (this.changed = !0, this.destroyBetween(this.index, i)), this.top = this.top.children[this.index];
			else {
				let r = Ki.create(this.top, e[a], t, n);
				this.top.children.splice(this.index, 0, r), this.top = r, this.changed = !0;
			}
			this.index = 0, a++;
		}
	}
	findNodeMatch(e, t, n, r) {
		let i = -1, a;
		if (r >= this.preMatch.index && (a = this.preMatch.matches[r - this.preMatch.index]).parent == this.top && a.matchesNode(e, t, n)) i = this.top.children.indexOf(a, this.index);
		else for (let r = this.index, a = Math.min(this.top.children.length, r + 5); r < a; r++) {
			let a = this.top.children[r];
			if (a.matchesNode(e, t, n) && !this.preMatch.matched.has(a)) {
				i = r;
				break;
			}
		}
		return i < 0 ? !1 : (this.destroyBetween(this.index, i), this.index++, !0);
	}
	updateNodeAt(e, t, n, r, i) {
		let a = this.top.children[r];
		return a.dirty == L && a.dom == a.contentDOM && (a.dirty = Hi), a.update(e, t, n, i) ? (this.destroyBetween(this.index, r), this.index++, !0) : !1;
	}
	findIndexWithChild(e) {
		for (;;) {
			let t = e.parentNode;
			if (!t) return -1;
			if (t == this.top.contentDOM) {
				let t = e.pmViewDesc;
				if (t) {
					for (let e = this.index; e < this.top.children.length; e++) if (this.top.children[e] == t) return e;
				}
				return -1;
			}
			e = t;
		}
	}
	updateNextNode(e, t, n, r, i, a) {
		for (let o = this.index; o < this.top.children.length; o++) {
			let s = this.top.children[o];
			if (s instanceof qi) {
				let c = this.preMatch.matched.get(s);
				if (c != null && c != i) return !1;
				let l = s.dom, u, d = this.isLocked(l) && !(e.isText && s.node && s.node.isText && s.nodeDOM.nodeValue == e.text && s.dirty != L && aa(t, s.outerDeco));
				if (!d && s.update(e, t, n, r)) return this.destroyBetween(this.index, o), s.dom != l && (this.changed = !0), this.index++, !0;
				if (!d && (u = this.recreateWrapper(s, e, t, n, r, a))) return this.destroyBetween(this.index, o), this.top.children[this.index] = u, u.contentDOM && (u.dirty = Hi, u.updateChildren(r, a + 1), u.dirty = I), this.changed = !0, this.index++, !0;
				break;
			}
		}
		return !1;
	}
	recreateWrapper(e, t, n, r, i, a) {
		if (e.dirty || t.isAtom || !e.children.length || !e.node.content.eq(t.content) || !aa(n, e.outerDeco) || !r.eq(e.innerDeco)) return null;
		let o = qi.create(this.top, t, n, r, i, a);
		if (o.contentDOM) {
			o.children = e.children, e.children = [];
			for (let e of o.children) e.parent = o;
		}
		return e.destroy(), o;
	}
	addNode(e, t, n, r, i) {
		let a = qi.create(this.top, e, t, n, r, i);
		a.contentDOM && a.updateChildren(r, i + 1), this.top.children.splice(this.index++, 0, a), this.changed = !0;
	}
	placeWidget(e, t, n) {
		let r = this.index < this.top.children.length ? this.top.children[this.index] : null;
		if (r && r.matchesWidget(e) && (e == r.widget || !r.widget.type.toDOM.parentNode)) this.index++;
		else {
			let r = new Wi(this.top, e, t, n);
			this.top.children.splice(this.index++, 0, r), this.changed = !0;
		}
	}
	addTextblockHacks() {
		let e = this.top.children[this.index - 1], t = this.top;
		for (; e instanceof Ki;) t = e, e = t.children[t.children.length - 1];
		(!e || !(e instanceof Yi) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((P || N) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", t), this.addHackNode("BR", this.top));
	}
	addHackNode(e, t) {
		if (t == this.top && this.index < t.children.length && t.children[this.index].matchesHack(e)) this.index++;
		else {
			let n = document.createElement(e);
			e == "IMG" && (n.className = "ProseMirror-separator", n.alt = ""), e == "BR" && (n.className = "ProseMirror-trailingBreak");
			let r = new Xi(this.top, [], n, null);
			t == this.top ? t.children.splice(this.index++, 0, r) : t.children.push(r), this.changed = !0;
		}
	}
	isLocked(e) {
		return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
	}
};
function ca(e, t) {
	let n = t, r = n.children.length, i = e.childCount, a = /* @__PURE__ */ new Map(), o = [];
	outer: for (; i > 0;) {
		let s;
		for (;;) if (r) {
			let e = n.children[r - 1];
			if (e instanceof Ki) n = e, r = e.children.length;
			else {
				s = e, r--;
				break;
			}
		} else if (n == t) break outer;
		else r = n.parent.children.indexOf(n), n = n.parent;
		let c = s.node;
		if (c) {
			if (c != e.child(i - 1)) break;
			--i, a.set(s, i), o.push(s);
		}
	}
	return {
		index: i,
		matched: a,
		matches: o.reverse()
	};
}
function la(e, t) {
	return e.type.side - t.type.side;
}
function ua(e, t, n, r) {
	let i = t.locals(e), a = 0;
	if (i.length == 0) {
		for (let n = 0; n < e.childCount; n++) {
			let o = e.child(n);
			r(o, i, t.forChild(a, o), n), a += o.nodeSize;
		}
		return;
	}
	let o = 0, s = [], c = null;
	for (let l = 0;;) {
		let u, d;
		for (; o < i.length && i[o].to == a;) {
			let e = i[o++];
			e.widget && (u ? (d || (d = [u])).push(e) : u = e);
		}
		if (u) {
			if (d) {
				d.sort(la);
				for (let e = 0; e < d.length; e++) n(d[e], l, !!c);
			} else n(u, l, !!c);
		}
		let f, p;
		if (c) p = -1, f = c, c = null;
		else if (l < e.childCount) p = l, f = e.child(l++);
		else break;
		for (let e = 0; e < s.length; e++) s[e].to <= a && s.splice(e--, 1);
		for (; o < i.length && i[o].from <= a && i[o].to > a;) s.push(i[o++]);
		let m = a + f.nodeSize;
		if (f.isText) {
			let e = m;
			o < i.length && i[o].from < e && (e = i[o].from);
			for (let t = 0; t < s.length; t++) s[t].to < e && (e = s[t].to);
			e < m && (c = f.cut(e - a), f = f.cut(0, e - a), m = e, p = -1);
		} else for (; o < i.length && i[o].to < m;) o++;
		let h = f.isInline && !f.isLeaf ? s.filter((e) => !e.inline) : s.slice();
		r(f, h, t.forChild(a, f), p), a = m;
	}
}
function da(e) {
	if (e.nodeName == "UL" || e.nodeName == "OL") {
		let t = e.style.cssText;
		e.style.cssText = t + "; list-style: square !important", window.getComputedStyle(e).listStyle, e.style.cssText = t;
	}
}
function fa(e, t, n, r) {
	for (let i = 0, a = 0; i < e.childCount && a <= r;) {
		let o = e.child(i++), s = a;
		if (a += o.nodeSize, !o.isText) continue;
		let c = o.text;
		for (; i < e.childCount;) {
			let t = e.child(i++);
			if (a += t.nodeSize, !t.isText) break;
			c += t.text;
		}
		if (a >= n) {
			if (a >= r && c.slice(r - t.length - s, r - s) == t) return r - t.length;
			let e = s < r ? c.lastIndexOf(t, r - s - 1) : -1;
			if (e >= 0 && e + t.length + s >= n) return s + e;
			if (n == r && c.length >= r + t.length - s && c.slice(r - s, r - s + t.length) == t) return r;
		}
	}
	return -1;
}
function pa(e, t, n, r, i) {
	let a = [];
	for (let o = 0, s = 0; o < e.length; o++) {
		let c = e[o], l = s, u = s += c.size;
		l >= n || u <= t ? a.push(c) : (l < t && a.push(c.slice(0, t - l, r)), i && (a.push(i), i = void 0), u > n && a.push(c.slice(n - l, c.size, r)));
	}
	return a;
}
function ma(e, t = null) {
	let n = e.domSelectionRange(), r = e.state.doc;
	if (!n.focusNode) return null;
	let i = e.docView.nearestDesc(n.focusNode), a = i && i.size == 0, o = e.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
	if (o < 0) return null;
	let s = r.resolve(o), c, l;
	if (Kr(n)) {
		for (c = o; i && !i.node;) i = i.parent;
		let e = i.node;
		if (i && e.isAtom && E.isSelectable(e) && i.parent && !(e.isInline && Wr(n.focusNode, n.focusOffset, i.dom))) {
			let e = i.posBefore;
			l = new E(o == e ? s : r.resolve(e));
		}
	} else {
		if (n instanceof e.dom.ownerDocument.defaultView.Selection && n.rangeCount > 1) {
			let t = o, i = o;
			for (let r = 0; r < n.rangeCount; r++) {
				let a = n.getRangeAt(r);
				t = Math.min(t, e.docView.posFromDOM(a.startContainer, a.startOffset, 1)), i = Math.max(i, e.docView.posFromDOM(a.endContainer, a.endOffset, -1));
			}
			if (t < 0) return null;
			[c, o] = i == e.state.selection.anchor ? [i, t] : [t, i], s = r.resolve(o);
		} else c = e.docView.posFromDOM(n.anchorNode, n.anchorOffset, 1);
		if (c < 0) return null;
	}
	let u = r.resolve(c);
	if (!l) {
		let n = t == "pointer" || e.state.selection.head < s.pos && !a ? 1 : -1;
		l = Ta(e, u, s, n);
	}
	return l;
}
function ha(e) {
	return e.editable ? e.hasFocus() : Da(e) && document.activeElement && document.activeElement.contains(e.dom);
}
function ga(e, t = !1) {
	let n = e.state.selection;
	if (Ca(e, n), !ha(e)) return;
	let r = e.input.mouseDown;
	if (!t && N && r) {
		let t = e.domSelectionRange(), n = e.domObserver.currentSelection;
		if (t.anchorNode && n.anchorNode && zr(t.anchorNode, t.anchorOffset, n.anchorNode, n.anchorOffset) && r.delaySelUpdate()) {
			e.domObserver.setCurSelection();
			return;
		}
	}
	if (e.domObserver.disconnectSelection(), e.cursorWrapper) Sa(e);
	else {
		let { anchor: r, head: i } = n, a, o;
		_a && !(n instanceof T) && (n.$from.parent.inlineContent || (a = va(e, n.from)), !n.empty && !n.$from.parent.inlineContent && (o = va(e, n.to))), e.docView.setSelection(r, i, e, t), _a && (a && ba(a), o && ba(o)), n.visible ? e.dom.classList.remove("ProseMirror-hideselection") : (e.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && xa(e));
	}
	e.domObserver.setCurSelection(), e.domObserver.connectSelection();
}
var _a = P || N && ri < 63;
function va(e, t) {
	let { node: n, offset: r } = e.docView.domFromPos(t, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, a = r ? n.childNodes[r - 1] : null;
	if (P && i && i.contentEditable == "false") return ya(i);
	if ((!i || i.contentEditable == "false") && (!a || a.contentEditable == "false")) {
		if (i) return ya(i);
		if (a) return ya(a);
	}
}
function ya(e) {
	return e.contentEditable = "true", P && e.draggable && (e.draggable = !1, e.wasDraggable = !0), e;
}
function ba(e) {
	e.contentEditable = "false", e.wasDraggable && (e.draggable = !0, e.wasDraggable = null);
}
function xa(e) {
	let t = e.dom.ownerDocument;
	t.removeEventListener("selectionchange", e.input.hideSelectionGuard);
	let n = e.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
	t.addEventListener("selectionchange", e.input.hideSelectionGuard = () => {
		(n.anchorNode != r || n.anchorOffset != i) && (t.removeEventListener("selectionchange", e.input.hideSelectionGuard), setTimeout(() => {
			(!ha(e) || e.state.selection.visible) && e.dom.classList.remove("ProseMirror-hideselection");
		}, 20));
	});
}
function Sa(e) {
	let t = e.domSelection();
	if (!t) return;
	let n = e.cursorWrapper.dom, r = n.nodeName == "IMG";
	r ? t.collapse(n.parentNode, O(n) + 1) : t.collapse(n, 0), !r && !e.state.selection.visible && j && ti <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Ca(e, t) {
	if (t instanceof E) {
		let n = e.docView.descAt(t.from);
		n != e.lastSelectedViewDesc && (wa(e), n && n.selectNode(), e.lastSelectedViewDesc = n);
	} else wa(e);
}
function wa(e) {
	e.lastSelectedViewDesc && (e.lastSelectedViewDesc.parent && e.lastSelectedViewDesc.deselectNode(), e.lastSelectedViewDesc = void 0);
}
function Ta(e, t, n, r) {
	return e.someProp("createSelectionBetween", (r) => r(e, t, n)) || T.between(t, n, r);
}
function Ea(e) {
	return e.editable && !e.hasFocus() ? !1 : Da(e);
}
function Da(e) {
	let t = e.domSelectionRange();
	if (!t.anchorNode) return !1;
	try {
		return e.dom.contains(t.anchorNode.nodeType == 3 ? t.anchorNode.parentNode : t.anchorNode) && (e.editable || e.dom.contains(t.focusNode.nodeType == 3 ? t.focusNode.parentNode : t.focusNode));
	} catch {
		return !1;
	}
}
function Oa(e) {
	let t = e.docView.domFromPos(e.state.selection.anchor, 0), n = e.domSelectionRange();
	return zr(t.node, t.offset, n.anchorNode, n.anchorOffset);
}
function ka(e, t) {
	let { $anchor: n, $head: r } = e.selection, i = t > 0 ? n.max(r) : n.min(r), a = i.parent.inlineContent ? i.depth ? e.doc.resolve(t > 0 ? i.after() : i.before()) : null : i;
	return a && w.findFrom(a, t);
}
function Aa(e, t) {
	return e.dispatch(e.state.tr.setSelection(t).scrollIntoView()), !0;
}
function ja(e, t, n) {
	let r = e.state.selection;
	if (r instanceof T) {
		if (n.indexOf("s") > -1) {
			let { $head: n } = r, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter;
			if (!i || i.isText || !i.isLeaf) return !1;
			let a = e.state.doc.resolve(n.pos + i.nodeSize * (t < 0 ? -1 : 1));
			return Aa(e, new T(r.$anchor, a));
		}
		if (!r.empty) return !1;
		if (e.endOfTextblock(t > 0 ? "forward" : "backward")) {
			let n = ka(e.state, t);
			return n && n instanceof E ? Aa(e, n) : !1;
		}
		if (!(F && n.indexOf("m") > -1)) {
			let n = r.$head, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter, a;
			if (!i || i.isText) return !1;
			let o = t < 0 ? n.pos - i.nodeSize : n.pos;
			return i.isAtom || (a = e.docView.descAt(o)) && !a.contentDOM ? E.isSelectable(i) ? Aa(e, new E(t < 0 ? e.state.doc.resolve(n.pos - i.nodeSize) : n)) : si ? Aa(e, new T(e.state.doc.resolve(t < 0 ? o : o + i.nodeSize))) : !1 : !1;
		}
	} else if (r instanceof E && r.node.isInline) return Aa(e, new T(t > 0 ? r.$to : r.$from));
	else {
		let n = ka(e.state, t);
		return n ? Aa(e, n) : !1;
	}
}
function Ma(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function Na(e, t) {
	let n = e.pmViewDesc;
	return n && n.size == 0 && (t < 0 || e.nextSibling || e.nodeName != "BR");
}
function Pa(e, t) {
	return t < 0 ? Fa(e) : Ia(e);
}
function Fa(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i, a, o = !1;
	for (M && n.nodeType == 1 && r < Ma(n) && Na(n.childNodes[r], -1) && (o = !0);;) if (r > 0) {
		if (n.nodeType != 1) break;
		{
			let e = n.childNodes[r - 1];
			if (Na(e, -1)) i = n, a = --r;
			else if (e.nodeType == 3) n = e, r = n.nodeValue.length;
			else break;
		}
	} else if (La(n)) break;
	else {
		let t = n.previousSibling;
		for (; t && Na(t, -1);) i = n.parentNode, a = O(t), t = t.previousSibling;
		if (t) n = t, r = Ma(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = 0;
		}
	}
	o ? Ba(e, n, r) : i && Ba(e, i, a);
}
function Ia(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i = Ma(n), a, o;
	for (;;) if (r < i) {
		if (n.nodeType != 1) break;
		let e = n.childNodes[r];
		if (Na(e, 1)) a = n, o = ++r;
		else break;
	} else if (La(n)) break;
	else {
		let t = n.nextSibling;
		for (; t && Na(t, 1);) a = t.parentNode, o = O(t) + 1, t = t.nextSibling;
		if (t) n = t, r = 0, i = Ma(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = i = 0;
		}
	}
	a && Ba(e, a, o);
}
function La(e) {
	let t = e.pmViewDesc;
	return t && t.node && t.node.isBlock;
}
function Ra(e, t) {
	for (; e && t == e.childNodes.length && !Gr(e);) t = O(e) + 1, e = e.parentNode;
	for (; e && t < e.childNodes.length;) {
		let n = e.childNodes[t];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = 0;
	}
}
function za(e, t) {
	for (; e && !t && !Gr(e);) t = O(e), e = e.parentNode;
	for (; e && t;) {
		let n = e.childNodes[t - 1];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = e.childNodes.length;
	}
}
function Ba(e, t, n) {
	if (t.nodeType != 3) {
		let e, r;
		(r = Ra(t, n)) ? (t = r, n = 0) : (e = za(t, n)) && (t = e, n = e.nodeValue.length);
	}
	let r = e.domSelection();
	if (!r) return;
	if (Kr(r)) {
		let e = document.createRange();
		e.setEnd(t, n), e.setStart(t, n), r.removeAllRanges(), r.addRange(e);
	} else r.extend && r.extend(t, n);
	e.domObserver.setCurSelection();
	let { state: i } = e;
	setTimeout(() => {
		e.state == i && ga(e);
	}, 50);
}
function Va(e, t) {
	let n = e.state.doc.resolve(t);
	if (!(N || ai) && n.parent.inlineContent) {
		let r = e.coordsAtPos(t);
		if (t > n.start()) {
			let n = e.coordsAtPos(t - 1), i = (n.top + n.bottom) / 2;
			if (i > r.top && i < r.bottom && Math.abs(n.left - r.left) > 1) return n.left < r.left ? "ltr" : "rtl";
		}
		if (t < n.end()) {
			let n = e.coordsAtPos(t + 1), i = (n.top + n.bottom) / 2;
			if (i > r.top && i < r.bottom && Math.abs(n.left - r.left) > 1) return n.left > r.left ? "ltr" : "rtl";
		}
	}
	return getComputedStyle(e.dom).direction == "rtl" ? "rtl" : "ltr";
}
function Ha(e, t, n) {
	let r = e.state.selection;
	if (r instanceof T && !r.empty || n.indexOf("s") > -1 || F && n.indexOf("m") > -1) return !1;
	let { $from: i, $to: a } = r;
	if (!i.parent.inlineContent || e.endOfTextblock(t < 0 ? "up" : "down")) {
		let n = ka(e.state, t);
		if (n && n instanceof E) return Aa(e, n);
	}
	if (!i.parent.inlineContent) {
		let n = t < 0 ? i : a, o = r instanceof xn ? w.near(n, t) : w.findFrom(n, t);
		return o ? Aa(e, o) : !1;
	}
	return !1;
}
function Ua(e, t) {
	if (!(e.state.selection instanceof T)) return !0;
	let { $head: n, $anchor: r, empty: i } = e.state.selection;
	if (!n.sameParent(r)) return !0;
	if (!i) return !1;
	if (e.endOfTextblock(t > 0 ? "forward" : "backward")) return !0;
	let a = !n.textOffset && (t < 0 ? n.nodeBefore : n.nodeAfter);
	if (a && !a.isText) {
		let r = e.state.tr;
		return t < 0 ? r.delete(n.pos - a.nodeSize, n.pos) : r.delete(n.pos, n.pos + a.nodeSize), e.dispatch(r), !0;
	}
	return !1;
}
function Wa(e, t, n) {
	e.domObserver.stop(), t.contentEditable = n, e.domObserver.start();
}
function Ga(e) {
	if (!P || e.state.selection.$head.parentOffset > 0) return !1;
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (t && t.nodeType == 1 && n == 0 && t.firstChild && t.firstChild.contentEditable == "false") {
		let n = t.firstChild;
		Wa(e, n, "true"), setTimeout(() => Wa(e, n, "false"), 20);
	}
	return !1;
}
function Ka(e) {
	let t = "";
	return e.ctrlKey && (t += "c"), e.metaKey && (t += "m"), e.altKey && (t += "a"), e.shiftKey && (t += "s"), t;
}
function qa(e, t) {
	let n = t.keyCode, r = Ka(t);
	if (n == 8 || F && n == 72 && r == "c") return Ua(e, -1) || Pa(e, -1);
	if (n == 46 && !t.shiftKey || F && n == 68 && r == "c") return Ua(e, 1) || Pa(e, 1);
	if (n == 13 || n == 27) return !0;
	if (n == 37 || F && n == 66 && r == "c") {
		let t = n == 37 ? Va(e, e.state.selection.from) == "ltr" ? -1 : 1 : -1;
		return ja(e, t, r) || Pa(e, t);
	}
	if (n == 39 || F && n == 70 && r == "c") {
		let t = n == 39 ? Va(e, e.state.selection.from) == "ltr" ? 1 : -1 : 1;
		return ja(e, t, r) || Pa(e, t);
	}
	return n == 38 || F && n == 80 && r == "c" ? Ha(e, -1, r) || Pa(e, -1) : n == 40 || F && n == 78 && r == "c" ? Ga(e) || Ha(e, 1, r) || Pa(e, 1) : !(r != (F ? "m" : "c") || n != 66 && n != 73 && n != 89 && n != 90);
}
function Ja(e, t) {
	e.someProp("transformCopied", (n) => {
		t = n(t, e);
	});
	let n = [], { content: r, openStart: i, openEnd: a } = t;
	for (; i > 1 && a > 1 && r.childCount == 1 && r.firstChild.childCount == 1;) {
		i--, a--;
		let e = r.firstChild;
		n.push(e.type.name, e.attrs == e.type.defaultAttrs ? null : e.attrs), r = e.content;
	}
	let o = e.someProp("clipboardSerializer") || Qe.fromSchema(e.state.schema), s = io(), c = s.createElement("div");
	c.appendChild(o.serializeFragment(r, { document: s }));
	let l = c.firstChild, u, d = 0;
	for (; l && l.nodeType == 1 && (u = ro[l.nodeName.toLowerCase()]);) {
		for (let e = u.length - 1; e >= 0; e--) {
			let t = s.createElement(u[e]);
			for (; c.firstChild;) t.appendChild(c.firstChild);
			c.appendChild(t), d++;
		}
		l = c.firstChild;
	}
	return l && l.nodeType == 1 && l.setAttribute("data-pm-slice", `${i} ${a}${d ? ` -${d}` : ""} ${JSON.stringify(n)}`), {
		dom: c,
		text: e.someProp("clipboardTextSerializer", (n) => n(t, e)) || t.content.textBetween(0, t.content.size, "\n\n"),
		slice: t
	};
}
function Ya(e, t, n, r, i) {
	let o = i.parent.type.spec.code, s, c;
	if (!n && !t) return null;
	let l = !!t && (r || o || !n);
	if (l) {
		if (e.someProp("transformPastedText", (n) => {
			t = n(t, o || r, e);
		}), o) return c = new d(a.from(e.state.schema.text(t.replace(/\r\n?/g, "\n"))), 0, 0), e.someProp("transformPasted", (t) => {
			c = t(c, e, !0);
		}), c;
		let n = e.someProp("clipboardTextParser", (n) => n(t, i, r, e));
		if (n) c = n;
		else {
			let n = i.marks(), { schema: r } = e.state, a = Qe.fromSchema(r);
			s = document.createElement("div"), t.split(/(?:\r\n?|\n)+/).forEach((e) => {
				let t = s.appendChild(document.createElement("p"));
				e && t.appendChild(a.serializeNode(r.text(e, n)));
			});
		}
	} else e.someProp("transformPastedHTML", (t) => {
		n = t(n, e);
	}), s = so(n), si && co(s);
	let u = s && s.querySelector("[data-pm-slice]"), f = u && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(u.getAttribute("data-pm-slice") || "");
	if (f && f[3]) for (let e = +f[3]; e > 0; e--) {
		let e = s.firstChild;
		for (; e && e.nodeType != 1;) e = e.nextSibling;
		if (!e) break;
		s = e;
	}
	if (c || (c = (e.someProp("clipboardParser") || e.someProp("domParser") || Re.fromSchema(e.state.schema)).parseSlice(s, {
		preserveWhitespace: !!(l || f),
		context: i,
		ruleFromNode(e) {
			return e.nodeName == "BR" && !e.nextSibling && e.parentNode && !Xa.test(e.parentNode.nodeName) ? { ignore: !0 } : null;
		}
	})), f) c = lo(no(c, +f[1], +f[2]), f[4]);
	else if (c = d.maxOpen(Za(c.content, i), !0), c.openStart || c.openEnd) {
		let e = 0, t = 0;
		for (let t = c.content.firstChild; e < c.openStart && !t.type.spec.isolating; e++, t = t.firstChild);
		for (let e = c.content.lastChild; t < c.openEnd && !e.type.spec.isolating; t++, e = e.lastChild);
		c = no(c, e, t);
	}
	return e.someProp("transformPasted", (t) => {
		c = t(c, e, l);
	}), c;
}
var Xa = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function Za(e, t) {
	if (e.childCount < 2) return e;
	for (let n = t.depth; n >= 0; n--) {
		let r = t.node(n).contentMatchAt(t.index(n)), i, o = [];
		if (e.forEach((e) => {
			if (!o) return;
			let t = r.findWrapping(e.type), n;
			if (!t) return o = null;
			if (n = o.length && i.length && $a(t, i, e, o[o.length - 1], 0)) o[o.length - 1] = n;
			else {
				o.length && (o[o.length - 1] = eo(o[o.length - 1], i.length));
				let n = Qa(e, t);
				o.push(n), r = r.matchType(n.type), i = t;
			}
		}), o) return a.from(o);
	}
	return e;
}
function Qa(e, t, n = 0) {
	for (let r = t.length - 1; r >= n; r--) e = t[r].create(null, a.from(e));
	return e;
}
function $a(e, t, n, r, i) {
	if (i < e.length && i < t.length && e[i] == t[i]) {
		let o = $a(e, t, n, r.lastChild, i + 1);
		if (o) return r.copy(r.content.replaceChild(r.childCount - 1, o));
		if (r.contentMatchAt(r.childCount).matchType(i == e.length - 1 ? n.type : e[i + 1])) return r.copy(r.content.append(a.from(Qa(n, e, i + 1))));
	}
}
function eo(e, t) {
	if (t == 0) return e;
	let n = e.content.replaceChild(e.childCount - 1, eo(e.lastChild, t - 1)), r = e.contentMatchAt(e.childCount).fillBefore(a.empty, !0);
	return e.copy(n.append(r));
}
function to(e, t, n, r, i, o) {
	let s = t < 0 ? e.firstChild : e.lastChild, c = s.content;
	return e.childCount > 1 && (o = 0), i < r - 1 && (c = to(c, t, n, r, i + 1, o)), i >= n && (c = t < 0 ? s.contentMatchAt(0).fillBefore(c, o <= i).append(c) : c.append(s.contentMatchAt(s.childCount).fillBefore(a.empty, !0))), e.replaceChild(t < 0 ? 0 : e.childCount - 1, s.copy(c));
}
function no(e, t, n) {
	return t < e.openStart && (e = new d(to(e.content, -1, t, e.openStart, 0, e.openEnd), t, e.openEnd)), n < e.openEnd && (e = new d(to(e.content, 1, n, e.openEnd, 0, 0), e.openStart, n)), e;
}
var ro = {
	thead: ["table"],
	tbody: ["table"],
	tfoot: ["table"],
	caption: ["table"],
	colgroup: ["table"],
	col: ["table", "colgroup"],
	tr: ["table", "tbody"],
	td: [
		"table",
		"tbody",
		"tr"
	],
	th: [
		"table",
		"tbody",
		"tr"
	]
};
function io() {
	return document.implementation.createHTMLDocument("title");
}
var ao = null;
function oo(e) {
	let t = window.trustedTypes;
	if (!t) return e;
	if (!ao) {
		if (ao = t.defaultPolicy) try {
			return ao.createHTML(e);
		} catch {}
		ao = t.createPolicy("ProseMirrorClipboard", { createHTML: (e) => e });
	}
	return ao.createHTML(e);
}
function so(e) {
	let t = /^(\s*<meta [^>]*>)*/.exec(e);
	t && (e = e.slice(t[0].length));
	let n = io(), r = n.body, i = /<([a-z][^>\s]+)/i.exec(e), a;
	if ((a = i && ro[i[1].toLowerCase()]) && (e = a.map((e) => "<" + e + ">").join("") + e + a.map((e) => "</" + e + ">").reverse().join("")), r.innerHTML = oo(e), a) for (let e = 0; e < a.length; e++) r = r.querySelector(a[e]) || r;
	for (let e = 0; e < n.styleSheets.length; e++) {
		let t = n.styleSheets[e];
		for (let e = 0; e < t.rules.length; e++) {
			let n = t.rules[e];
			if (n instanceof CSSStyleRule) {
				let e = r.querySelectorAll(n.selectorText);
				for (let t = 0; t < e.length; t++) e[t].style.cssText += n.style.cssText;
			}
		}
	}
	return r;
}
function co(e) {
	let t = e.querySelectorAll(N ? "span:not([class]):not([style])" : "span.Apple-converted-space");
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		r.childNodes.length == 1 && r.textContent == "\xA0" && r.parentNode && r.parentNode.replaceChild(e.ownerDocument.createTextNode(" "), r);
	}
}
function lo(e, t) {
	if (!e.size) return e;
	let n = e.content.firstChild.type.schema, r;
	try {
		r = JSON.parse(t);
	} catch {
		return e;
	}
	let { content: i, openStart: o, openEnd: s } = e;
	for (let e = r.length - 2; e >= 0; e -= 2) {
		let t = n.nodes[r[e]];
		if (!t || t.hasRequiredAttrs()) break;
		try {
			t.checkAttrs(r[e + 1]);
		} catch {
			break;
		}
		i = a.from(t.create(r[e + 1], i)), o++, s++;
	}
	return new d(i, o, s);
}
var R = {}, z = {}, uo = {
	touchstart: !0,
	touchmove: !0
}, fo = class {
	constructor() {
		this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = {
			time: 0,
			x: 0,
			y: 0,
			type: "",
			button: 0
		}, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = Object.create(null), this.hideSelectionGuard = null;
	}
};
function po(e) {
	for (let t in R) {
		let n = R[t];
		e.dom.addEventListener(t, e.input.eventHandlers[t] = (t) => {
			vo(e, t) && !_o(e, t) && (e.editable || !(t.type in z)) && n(e, t);
		}, uo[t] ? { passive: !0 } : void 0);
	}
	P && e.dom.addEventListener("input", () => null), go(e);
}
function mo(e, t) {
	e.input.lastSelectionOrigin = t, e.input.lastSelectionTime = Date.now();
}
function ho(e) {
	e.input.mouseDown && e.input.mouseDown.done(), e.domObserver.stop();
	for (let t in e.input.eventHandlers) e.dom.removeEventListener(t, e.input.eventHandlers[t]);
	clearTimeout(e.input.composingTimeout), clearTimeout(e.input.lastIOSEnterFallbackTimeout);
}
function go(e) {
	e.someProp("handleDOMEvents", (t) => {
		for (let n in t) e.input.eventHandlers[n] || e.dom.addEventListener(n, e.input.eventHandlers[n] = (t) => _o(e, t));
	});
}
function _o(e, t) {
	return e.someProp("handleDOMEvents", (n) => {
		let r = n[t.type];
		return r ? r(e, t) || t.defaultPrevented : !1;
	});
}
function vo(e, t) {
	if (!t.bubbles) return !0;
	if (t.defaultPrevented) return !1;
	for (let n = t.target; n != e.dom; n = n.parentNode) if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(t)) return !1;
	return !0;
}
function yo(e, t) {
	!_o(e, t) && R[t.type] && (e.editable || !(t.type in z)) && R[t.type](e, t);
}
z.keydown = (e, t) => {
	let n = t;
	if (e.input.shiftKey = n.keyCode == 16 || n.shiftKey, !Io(e) && (e.input.lastKeyCode = n.keyCode, e.input.lastKeyCodeTime = Date.now(), !(oi && N && n.keyCode == 13))) {
		if (n.keyCode != 229 && e.domObserver.forceFlush(), ii && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
			let t = Date.now();
			e.input.lastIOSEnter = t, e.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
				e.input.lastIOSEnter == t && (e.someProp("handleKeyDown", (t) => t(e, qr(13, "Enter"))), e.input.lastIOSEnter = 0);
			}, 200);
		} else e.someProp("handleKeyDown", (t) => t(e, n)) || qa(e, n) ? n.preventDefault() : mo(e, "key");
	}
}, z.keyup = (e, t) => {
	t.keyCode == 16 && (e.input.shiftKey = !1);
}, z.keypress = (e, t) => {
	let n = t;
	if (Io(e) || !n.charCode || n.ctrlKey && !n.altKey || F && n.metaKey) return;
	if (e.someProp("handleKeyPress", (t) => t(e, n))) {
		n.preventDefault();
		return;
	}
	let r = e.state.selection;
	if (!(r instanceof T) || !r.$from.sameParent(r.$to)) {
		let t = String.fromCharCode(n.charCode), i = () => e.state.tr.insertText(t).scrollIntoView();
		!/[\r\n]/.test(t) && !e.someProp("handleTextInput", (n) => n(e, r.$from.pos, r.$to.pos, t, i)) && e.dispatch(i()), n.preventDefault();
	}
};
function bo(e) {
	return {
		left: e.clientX,
		top: e.clientY
	};
}
function xo(e, t) {
	let n = t.x - e.clientX, r = t.y - e.clientY;
	return n * n + r * r < 100;
}
function So(e, t, n, r, i) {
	if (r == -1) return !1;
	let a = e.state.doc.resolve(r);
	for (let r = a.depth + 1; r > 0; r--) if (e.someProp(t, (t) => r > a.depth ? t(e, n, a.nodeAfter, a.before(r), i, !0) : t(e, n, a.node(r), a.before(r), i, !1))) return !0;
	return !1;
}
function Co(e, t, n) {
	if (e.focused || e.focus(), e.state.selection.eq(t)) return;
	let r = e.state.tr.setSelection(t);
	n == "pointer" && r.setMeta("pointer", !0), e.dispatch(r);
}
function wo(e, t) {
	if (t == -1) return !1;
	let n = e.state.doc.resolve(t), r = n.nodeAfter;
	return r && r.isAtom && E.isSelectable(r) ? (Co(e, new E(n), "pointer"), !0) : !1;
}
function To(e, t) {
	if (t == -1) return !1;
	let n = e.state.selection, r, i;
	n instanceof E && (r = n.node);
	let a = e.state.doc.resolve(t);
	for (let e = a.depth + 1; e > 0; e--) {
		let t = e > a.depth ? a.nodeAfter : a.node(e);
		if (E.isSelectable(t)) {
			i = r && n.$from.depth > 0 && e >= n.$from.depth && a.before(n.$from.depth + 1) == n.$from.pos ? a.before(n.$from.depth) : a.before(e);
			break;
		}
	}
	return i != null && (Co(e, E.create(e.state.doc, i), "pointer"), !0);
}
function Eo(e, t, n, r, i) {
	return So(e, "handleClickOn", t, n, r) || e.someProp("handleClick", (n) => n(e, t, r)) || (i ? To(e, n) : wo(e, n));
}
function Do(e, t, n, r) {
	return So(e, "handleDoubleClickOn", t, n, r) || e.someProp("handleDoubleClick", (n) => n(e, t, r));
}
function Oo(e, t, n, r) {
	return So(e, "handleTripleClickOn", t, n, r) || e.someProp("handleTripleClick", (n) => n(e, t, r)) || ko(e, n, r);
}
function ko(e, t, n) {
	if (n.button != 0) return !1;
	let r = Ao(e, t, !0), i = e.state.doc;
	return r ? (Co(e, r, "pointer"), r instanceof T && i.eq(e.state.doc) && (e.input.mouseDown = new Fo(e, r)), !0) : !1;
}
function Ao(e, t, n) {
	let r = e.state.doc;
	if (t == -1) return r.inlineContent ? T.create(r, 0, r.content.size) : null;
	let i = r.resolve(t);
	for (let e = i.depth + 1; e > 0; e--) {
		let t = e > i.depth ? i.nodeAfter : i.node(e), a = i.before(e);
		if (t.inlineContent) return T.create(r, a + 1, a + 1 + t.content.size);
		if (n && E.isSelectable(t)) return E.create(r, a);
	}
	return null;
}
function jo(e) {
	return Ho(e);
}
var Mo = F ? "metaKey" : "ctrlKey";
R.mousedown = (e, t) => {
	let n = t;
	e.input.shiftKey = n.shiftKey;
	let r = jo(e), i = Date.now(), a = "singleClick";
	i - e.input.lastClick.time < 500 && xo(n, e.input.lastClick) && !n[Mo] && e.input.lastClick.button == n.button && (e.input.lastClick.type == "singleClick" ? a = "doubleClick" : e.input.lastClick.type == "doubleClick" && (a = "tripleClick")), e.input.lastClick = {
		time: i,
		x: n.clientX,
		y: n.clientY,
		type: a,
		button: n.button
	}, e.input.mouseDown && e.input.mouseDown.done();
	let o = e.posAtCoords(bo(n));
	o && (a == "singleClick" ? e.input.mouseDown = new Po(e, o, n, !!r) : (a == "doubleClick" ? Do : Oo)(e, o.pos, o.inside, n) ? n.preventDefault() : mo(e, "pointer"));
};
var No = class {
	constructor(e) {
		this.view = e, this.mightDrag = null, e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this));
	}
	up(e) {
		this.done();
	}
	move(e) {
		e.buttons == 0 && this.done();
	}
	done() {
		this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.view.input.mouseDown == this && (this.view.input.mouseDown = null);
	}
	delaySelUpdate() {
		return !1;
	}
}, Po = class extends No {
	constructor(e, t, n, r) {
		super(e), this.pos = t, this.event = n, this.flushed = r, this.delayedSelectionSync = !1, this.startDoc = e.state.doc, this.selectNode = !!n[Mo], this.allowDefault = n.shiftKey;
		let i, a;
		if (t.inside > -1) i = e.state.doc.nodeAt(t.inside), a = t.inside;
		else {
			let n = e.state.doc.resolve(t.pos);
			i = n.parent, a = n.depth ? n.before() : 0;
		}
		let o = r ? null : n.target, s = o ? e.docView.nearestDesc(o, !0) : null;
		this.target = s && s.nodeDOM.nodeType == 1 ? s.nodeDOM : null;
		let { selection: c } = e.state;
		n.button == 0 && (i.type.spec.draggable && i.type.spec.selectable !== !1 || c instanceof E && c.from <= a && c.to > a) && (this.mightDrag = {
			node: i,
			pos: a,
			addAttr: !!(this.target && !this.target.draggable),
			setUneditable: !!(this.target && M && !this.target.hasAttribute("contentEditable"))
		}), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
			this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
		}, 20), this.view.domObserver.start()), mo(e, "pointer");
	}
	done() {
		super.done(), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => {
			this.view.isDestroyed || ga(this.view);
		});
	}
	up(e) {
		if (this.done(), !this.view.dom.contains(e.target)) return;
		let t = this.pos;
		this.view.state.doc != this.startDoc && (t = this.view.posAtCoords(bo(e))), this.updateAllowDefault(e), this.allowDefault || !t ? mo(this.view, "pointer") : Eo(this.view, t.pos, t.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || P && this.mightDrag && !this.mightDrag.node.isAtom || N && !this.view.state.selection.visible && Math.min(Math.abs(t.pos - this.view.state.selection.from), Math.abs(t.pos - this.view.state.selection.to)) <= 2) ? (Co(this.view, w.near(this.view.state.doc.resolve(t.pos)), "pointer"), e.preventDefault()) : mo(this.view, "pointer");
	}
	move(e) {
		this.updateAllowDefault(e), mo(this.view, "pointer"), super.move(e);
	}
	updateAllowDefault(e) {
		!this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
	}
	delaySelUpdate() {
		return this.allowDefault ? (this.delayedSelectionSync = !0, !0) : !1;
	}
}, Fo = class extends No {
	constructor(e, t) {
		super(e), this.startSelection = t, this.startDoc = e.state.doc;
	}
	move(e) {
		if (e.buttons == 0 || this.view.isDestroyed || !this.view.state.doc.eq(this.startDoc)) {
			this.done();
			return;
		}
		e.preventDefault(), mo(this.view, "pointer");
		let t = this.view.posAtCoords(bo(e)), n = t && Ao(this.view, t.inside, !1);
		if (!n) return;
		let { doc: r } = this.view.state, i = this.startSelection, [a, o] = n.from < i.from ? [i.to, n.from] : [i.from, n.to];
		Co(this.view, T.create(r, a, o), "pointer");
	}
};
R.touchstart = (e) => {
	e.input.lastTouch = Date.now(), jo(e), mo(e, "pointer");
}, R.touchmove = (e) => {
	e.input.lastTouch = Date.now(), mo(e, "pointer");
}, R.contextmenu = (e) => jo(e);
function Io(e, t) {
	return e.composing ? !0 : P && Math.abs(Date.now() - e.input.compositionEndedAt) < 500 ? (e.input.compositionEndedAt = -2e8, !0) : !1;
}
var Lo = oi ? 5e3 : -1;
z.compositionstart = z.compositionupdate = (e) => {
	if (!e.composing) {
		e.domObserver.flush();
		let { state: t } = e, n = t.selection.$to;
		if (t.selection instanceof T && (t.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((e) => e.type.spec.inclusive === !1) || N && ai && Ro(e))) e.markCursor = e.state.storedMarks || n.marks(), Ho(e, !0), e.markCursor = null;
		else if (Ho(e, !t.selection.empty), M && t.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
			let t = e.domSelectionRange();
			for (let n = t.focusNode, r = t.focusOffset; n && n.nodeType == 1 && r != 0;) {
				let t = r < 0 ? n.lastChild : n.childNodes[r - 1];
				if (!t) break;
				if (t.nodeType == 3) {
					let n = e.domSelection();
					n && n.collapse(t, t.nodeValue.length);
					break;
				}
				n = t, r = -1;
			}
		}
		e.input.composing = !0;
	}
	zo(e, Lo);
};
function Ro(e) {
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (!t || t.nodeType != 1 || n >= t.childNodes.length) return !1;
	let r = t.childNodes[n];
	return r.nodeType == 1 && r.contentEditable == "false";
}
z.compositionend = (e, t) => {
	e.composing && (e.input.composing = !1, e.input.compositionEndedAt = Date.now(), e.input.compositionPendingChanges = e.domObserver.pendingRecords().length ? e.input.compositionID : 0, e.input.compositionNode = null, e.input.badSafariComposition ? e.domObserver.forceFlush() : e.input.compositionPendingChanges && Promise.resolve().then(() => e.domObserver.flush()), e.input.compositionID++, zo(e, 20));
};
function zo(e, t) {
	clearTimeout(e.input.composingTimeout), t > -1 && (e.input.composingTimeout = setTimeout(() => Ho(e), t));
}
function Bo(e) {
	for (e.composing && (e.input.composing = !1, e.input.compositionEndedAt = Date.now()); e.input.compositionNodes.length > 0;) e.input.compositionNodes.pop().markParentsDirty();
}
function Vo(e) {
	let t = e.domSelectionRange();
	if (!t.focusNode) return null;
	let n = Hr(t.focusNode, t.focusOffset), r = Ur(t.focusNode, t.focusOffset);
	if (n && r && n != r) {
		let t = r.pmViewDesc, i = e.domObserver.lastChangedTextNode;
		if (n == i || r == i) return i;
		if (!t || !t.isText(r.nodeValue)) return r;
		if (e.input.compositionNode == r) {
			let e = n.pmViewDesc;
			if (!(!e || !e.isText(n.nodeValue))) return r;
		}
	}
	return n || r;
}
function Ho(e, t = !1) {
	if (!(oi && e.domObserver.flushingSoon >= 0)) {
		if (e.domObserver.forceFlush(), Bo(e), t || e.docView && e.docView.dirty) {
			let n = ma(e), r = e.state.selection;
			return n && !n.eq(r) ? e.dispatch(e.state.tr.setSelection(n)) : (e.markCursor || t) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? e.dispatch(e.state.tr.deleteSelection()) : e.updateState(e.state), !0;
		}
		return !1;
	}
}
function Uo(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.dom.parentNode.appendChild(document.createElement("div"));
	n.appendChild(t), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
	let r = getSelection(), i = document.createRange();
	i.selectNodeContents(t), e.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
		n.parentNode && n.parentNode.removeChild(n), e.focus();
	}, 50);
}
var Wo = j && ti < 15 || ii && ci < 604;
R.copy = z.cut = (e, t) => {
	let n = t, r = e.state.selection, i = n.type == "cut";
	if (r.empty) return;
	let a = Wo ? null : n.clipboardData, { dom: o, text: s } = Ja(e, r.content());
	a ? (n.preventDefault(), a.clearData(), a.setData("text/html", o.innerHTML), a.setData("text/plain", s)) : Uo(e, o), i && e.dispatch(e.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function Go(e) {
	return e.openStart == 0 && e.openEnd == 0 && e.content.childCount == 1 ? e.content.firstChild : null;
}
function Ko(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.input.shiftKey || e.state.selection.$from.parent.type.spec.code, r = e.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
	n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
	let i = e.input.shiftKey && e.input.lastKeyCode != 45;
	setTimeout(() => {
		e.focus(), r.parentNode && r.parentNode.removeChild(r), n ? qo(e, r.value, null, i, t) : qo(e, r.textContent, r.innerHTML, i, t);
	}, 50);
}
function qo(e, t, n, r, i) {
	let a = Ya(e, t, n, r, e.state.selection.$from);
	if (e.someProp("handlePaste", (t) => t(e, i, a || d.empty))) return !0;
	if (!a) return !1;
	let o = Go(a), s = o ? e.state.tr.replaceSelectionWith(o, r) : e.state.tr.replaceSelection(a);
	return e.dispatch(s.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function Jo(e) {
	let t = e.getData("text/plain") || e.getData("Text");
	if (t) return t;
	let n = e.getData("text/uri-list");
	return n ? n.replace(/\r?\n/g, " ") : "";
}
z.paste = (e, t) => {
	let n = t;
	if (e.composing && !oi) return;
	let r = Wo ? null : n.clipboardData, i = e.input.shiftKey && e.input.lastKeyCode != 45;
	r && qo(e, Jo(r), r.getData("text/html"), i, n) ? n.preventDefault() : Ko(e, n);
};
var Yo = class {
	constructor(e, t, n) {
		this.slice = e, this.move = t, this.node = n;
	}
}, Xo = F ? "altKey" : "ctrlKey";
function Zo(e, t) {
	let n;
	return e.someProp("dragCopies", (e) => {
		n = n || e(t);
	}), n == null ? !t[Xo] : !n;
}
R.dragstart = (e, t) => {
	let n = t, r = e.input.mouseDown;
	if (r && r.done(), !n.dataTransfer) return;
	let i = e.state.selection, a = i.empty ? null : e.posAtCoords(bo(n)), o;
	if (!(a && a.pos >= i.from && a.pos <= (i instanceof E ? i.to - 1 : i.to))) {
		if (r && r.mightDrag) o = E.create(e.state.doc, r.mightDrag.pos);
		else if (n.target && n.target.nodeType == 1) {
			let t = e.docView.nearestDesc(n.target, !0);
			t && t.node.type.spec.draggable && t != e.docView && (o = E.create(e.state.doc, t.posBefore));
		}
	}
	let { dom: s, text: c, slice: l } = Ja(e, (o || e.state.selection).content());
	(!n.dataTransfer.files.length || !N || ri > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(Wo ? "Text" : "text/html", s.innerHTML), n.dataTransfer.effectAllowed = "copyMove", Wo || n.dataTransfer.setData("text/plain", c), e.dragging = new Yo(l, Zo(e, n), o);
}, R.dragend = (e) => {
	let t = e.dragging;
	window.setTimeout(() => {
		e.dragging == t && (e.dragging = null);
	}, 50);
}, z.dragover = z.dragenter = (e, t) => t.preventDefault(), z.drop = (e, t) => {
	try {
		Qo(e, t, e.dragging);
	} finally {
		e.dragging = null;
	}
};
function Qo(e, t, n) {
	if (!t.dataTransfer) return;
	let r = e.posAtCoords(bo(t));
	if (!r) return;
	let i = e.state.doc.resolve(r.pos), a = n && n.slice;
	a ? e.someProp("transformPasted", (t) => {
		a = t(a, e, !1);
	}) : a = Ya(e, Jo(t.dataTransfer), Wo ? null : t.dataTransfer.getData("text/html"), !1, i);
	let o = !!(n && Zo(e, t));
	if (e.someProp("handleDrop", (n) => n(e, t, a || d.empty, o))) {
		t.preventDefault();
		return;
	}
	if (!a) return;
	t.preventDefault();
	let s = a ? Jt(e.state.doc, i.pos, a) : i.pos;
	s ?? (s = i.pos);
	let c = e.state.tr;
	if (o) {
		let { node: e } = n;
		e ? e.replace(c) : c.deleteSelection();
	}
	let l = c.mapping.map(s), u = a.openStart == 0 && a.openEnd == 0 && a.content.childCount == 1, f = c.doc;
	if (u ? c.replaceRangeWith(l, l, a.content.firstChild) : c.replaceRange(l, l, a), c.doc.eq(f)) return;
	let p = c.doc.resolve(l);
	if (u && E.isSelectable(a.content.firstChild) && p.nodeAfter && p.nodeAfter.sameMarkup(a.content.firstChild)) c.setSelection(new E(p));
	else {
		let t = c.mapping.map(s);
		c.mapping.maps[c.mapping.maps.length - 1].forEach((e, n, r, i) => t = i), c.setSelection(Ta(e, p, c.doc.resolve(t)));
	}
	e.focus(), e.dispatch(c.setMeta("uiEvent", "drop"));
}
R.focus = (e) => {
	e.input.lastFocus = Date.now(), e.focused || (e.domObserver.stop(), e.dom.classList.add("ProseMirror-focused"), e.domObserver.start(), e.focused = !0, setTimeout(() => {
		e.docView && e.hasFocus() && !e.domObserver.currentSelection.eq(e.domSelectionRange()) && ga(e);
	}, 20));
}, R.blur = (e, t) => {
	let n = t;
	e.focused && (e.domObserver.stop(), e.dom.classList.remove("ProseMirror-focused"), e.domObserver.start(), n.relatedTarget && e.dom.contains(n.relatedTarget) && e.domObserver.currentSelection.clear(), e.focused = !1);
}, R.beforeinput = (e, t) => {
	if (oi && t.inputType == "deleteContentBackward") {
		e.domObserver.flushSoon();
		let { domChangeCount: t } = e.input;
		setTimeout(() => {
			if (e.input.domChangeCount != t || (e.dom.blur(), e.focus(), e.someProp("handleKeyDown", (t) => t(e, qr(8, "Backspace"))))) return;
			let { $cursor: n } = e.state.selection;
			n && n.pos > 0 && e.dispatch(e.state.tr.delete(n.pos - 1, n.pos).scrollIntoView());
		}, 50);
	}
};
for (let e in z) R[e] = z[e];
function $o(e, t) {
	if (e == t) return !0;
	for (let n in e) if (e[n] !== t[n]) return !1;
	for (let n in t) if (!(n in e)) return !1;
	return !0;
}
var es = class e {
	constructor(e, t) {
		this.toDOM = e, this.spec = t || is, this.side = this.spec.side || 0;
	}
	map(e, t, n, r) {
		let { pos: i, deleted: a } = e.mapResult(t.from + r, this.side < 0 ? -1 : 1);
		return a ? null : new B(i - n, i - n, this);
	}
	valid() {
		return !0;
	}
	eq(t) {
		return this == t || t instanceof e && (this.spec.key && this.spec.key == t.spec.key || this.toDOM == t.toDOM && $o(this.spec, t.spec));
	}
	destroy(e) {
		this.spec.destroy && this.spec.destroy(e);
	}
}, ts = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || is;
	}
	map(e, t, n, r) {
		let i = e.map(t.from + r, this.spec.inclusiveStart ? -1 : 1) - n, a = e.map(t.to + r, this.spec.inclusiveEnd ? 1 : -1) - n;
		return i >= a ? null : new B(i, a, this);
	}
	valid(e, t) {
		return t.from < t.to;
	}
	eq(t) {
		return this == t || t instanceof e && $o(this.attrs, t.attrs) && $o(this.spec, t.spec);
	}
	static is(t) {
		return t.type instanceof e;
	}
	destroy() {}
}, ns = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || is;
	}
	map(e, t, n, r) {
		let i = e.mapResult(t.from + r, 1);
		if (i.deleted) return null;
		let a = e.mapResult(t.to + r, -1);
		return a.deleted || a.pos <= i.pos ? null : new B(i.pos - n, a.pos - n, this);
	}
	valid(e, t) {
		let { index: n, offset: r } = e.content.findIndex(t.from), i;
		return r == t.from && !(i = e.child(n)).isText && r + i.nodeSize == t.to;
	}
	eq(t) {
		return this == t || t instanceof e && $o(this.attrs, t.attrs) && $o(this.spec, t.spec);
	}
	destroy() {}
}, B = class e {
	constructor(e, t, n) {
		this.from = e, this.to = t, this.type = n;
	}
	copy(t, n) {
		return new e(t, n, this.type);
	}
	eq(e, t = 0) {
		return this.type.eq(e.type) && this.from + t == e.from && this.to + t == e.to;
	}
	map(e, t, n) {
		return this.type.map(e, this, t, n);
	}
	static widget(t, n, r) {
		return new e(t, t, new es(n, r));
	}
	static inline(t, n, r, i) {
		return new e(t, n, new ts(r, i));
	}
	static node(t, n, r, i) {
		return new e(t, n, new ns(r, i));
	}
	get spec() {
		return this.type.spec;
	}
	get inline() {
		return this.type instanceof ts;
	}
	get widget() {
		return this.type instanceof es;
	}
}, rs = [], is = {}, V = class e {
	constructor(e, t) {
		this.local = e.length ? e : rs, this.children = t.length ? t : rs;
	}
	static create(e, t) {
		return t.length ? fs(t, e, 0, is) : H;
	}
	find(e, t, n) {
		let r = [];
		return this.findInner(e ?? 0, t ?? 1e9, r, 0, n), r;
	}
	findInner(e, t, n, r, i) {
		for (let a = 0; a < this.local.length; a++) {
			let o = this.local[a];
			o.from <= t && o.to >= e && (!i || i(o.spec)) && n.push(o.copy(o.from + r, o.to + r));
		}
		for (let a = 0; a < this.children.length; a += 3) if (this.children[a] < t && this.children[a + 1] > e) {
			let o = this.children[a] + 1;
			this.children[a + 2].findInner(e - o, t - o, n, r + o, i);
		}
	}
	map(e, t, n) {
		return this == H || e.maps.length == 0 ? this : this.mapInner(e, t, 0, 0, n || is);
	}
	mapInner(t, n, r, i, a) {
		let o;
		for (let e = 0; e < this.local.length; e++) {
			let s = this.local[e].map(t, r, i);
			s && s.type.valid(n, s) ? (o || (o = [])).push(s) : a.onRemove && a.onRemove(this.local[e].spec);
		}
		return this.children.length ? ss(this.children, o || [], t, n, r, i, a) : o ? new e(o.sort(ps), rs) : H;
	}
	add(t, n) {
		return n.length ? this == H ? e.create(t, n) : this.addInner(t, n, 0) : this;
	}
	addInner(t, n, r) {
		let i, a = 0;
		t.forEach((e, t) => {
			let o = t + r, s;
			if (s = us(n, e, o)) {
				for (i || (i = this.children.slice()); a < i.length && i[a] < t;) a += 3;
				i[a] == t ? i[a + 2] = i[a + 2].addInner(e, s, o + 1) : i.splice(a, 0, t, t + e.nodeSize, fs(s, e, o + 1, is)), a += 3;
			}
		});
		let o = cs(a ? ds(n) : n, -r);
		for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || o.splice(e--, 1);
		return new e(o.length ? this.local.concat(o).sort(ps) : this.local, i || this.children);
	}
	remove(e) {
		return e.length == 0 || this == H ? this : this.removeInner(e, 0);
	}
	removeInner(t, n) {
		let r = this.children, i = this.local;
		for (let e = 0; e < r.length; e += 3) {
			let i, a = r[e] + n, o = r[e + 1] + n;
			for (let e = 0, n; e < t.length; e++) (n = t[e]) && n.from > a && n.to < o && (t[e] = null, (i || (i = [])).push(n));
			if (!i) continue;
			r == this.children && (r = this.children.slice());
			let s = r[e + 2].removeInner(i, a + 1);
			s == H ? (r.splice(e, 3), e -= 3) : r[e + 2] = s;
		}
		if (i.length) {
			for (let e = 0, r; e < t.length; e++) if (r = t[e]) for (let e = 0; e < i.length; e++) i[e].eq(r, n) && (i == this.local && (i = this.local.slice()), i.splice(e--, 1));
		}
		return r == this.children && i == this.local ? this : i.length || r.length ? new e(i, r) : H;
	}
	forChild(t, n) {
		if (this == H) return this;
		if (n.isLeaf) return e.empty;
		let r, i;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] >= t) {
			this.children[e] == t && (r = this.children[e + 2]);
			break;
		}
		let a = t + 1, o = a + n.content.size;
		for (let e = 0; e < this.local.length; e++) {
			let t = this.local[e];
			if (t.from < o && t.to > a && t.type instanceof ts) {
				let e = Math.max(a, t.from) - a, n = Math.min(o, t.to) - a;
				e < n && (i || (i = [])).push(t.copy(e, n));
			}
		}
		if (i) {
			let t = new e(i.sort(ps), rs);
			return r ? new as([t, r]) : t;
		}
		return r || H;
	}
	eq(t) {
		if (this == t) return !0;
		if (!(t instanceof e) || this.local.length != t.local.length || this.children.length != t.children.length) return !1;
		for (let e = 0; e < this.local.length; e++) if (!this.local[e].eq(t.local[e])) return !1;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] != t.children[e] || this.children[e + 1] != t.children[e + 1] || !this.children[e + 2].eq(t.children[e + 2])) return !1;
		return !0;
	}
	locals(e) {
		return ms(this.localsInner(e));
	}
	localsInner(e) {
		if (this == H) return rs;
		if (e.inlineContent || !this.local.some(ts.is)) return this.local;
		let t = [];
		for (let e = 0; e < this.local.length; e++) this.local[e].type instanceof ts || t.push(this.local[e]);
		return t;
	}
	forEachSet(e) {
		e(this);
	}
};
V.empty = new V([], []), V.removeOverlap = ms;
var H = V.empty, as = class e {
	constructor(e) {
		this.members = e;
	}
	map(t, n) {
		let r = this.members.map((e) => e.map(t, n, is));
		return e.from(r);
	}
	forChild(t, n) {
		if (n.isLeaf) return V.empty;
		let r = [];
		for (let i = 0; i < this.members.length; i++) {
			let a = this.members[i].forChild(t, n);
			a != H && (a instanceof e ? r = r.concat(a.members) : r.push(a));
		}
		return e.from(r);
	}
	eq(t) {
		if (!(t instanceof e) || t.members.length != this.members.length) return !1;
		for (let e = 0; e < this.members.length; e++) if (!this.members[e].eq(t.members[e])) return !1;
		return !0;
	}
	locals(e) {
		let t, n = !0;
		for (let r = 0; r < this.members.length; r++) {
			let i = this.members[r].localsInner(e);
			if (i.length) {
				if (!t) t = i;
				else {
					n && (t = t.slice(), n = !1);
					for (let e = 0; e < i.length; e++) t.push(i[e]);
				}
			}
		}
		return t ? ms(n ? t : t.sort(ps)) : rs;
	}
	static from(t) {
		switch (t.length) {
			case 0: return H;
			case 1: return t[0];
			default: return new e(t.every((e) => e instanceof V) ? t : t.reduce((e, t) => e.concat(t instanceof V ? t : t.members), []));
		}
	}
	forEachSet(e) {
		for (let t = 0; t < this.members.length; t++) this.members[t].forEachSet(e);
	}
};
function ss(e, t, n, r, i, a, o) {
	let s = e.slice();
	for (let e = 0, t = a; e < n.maps.length; e++) {
		let r = 0;
		n.maps[e].forEach((e, n, i, a) => {
			let o = a - i - (n - e);
			for (let i = 0; i < s.length; i += 3) {
				let a = s[i + 1];
				if (a < 0 || e > a + t - r) continue;
				let c = s[i] + t - r;
				n >= c ? s[i + 1] = e <= c ? -2 : -1 : e >= t && o && (s[i] += o, s[i + 1] += o);
			}
			r += o;
		}), t = n.maps[e].map(t, -1);
	}
	let c = !1;
	for (let t = 0; t < s.length; t += 3) if (s[t + 1] < 0) {
		if (s[t + 1] == -2) {
			c = !0, s[t + 1] = -1;
			continue;
		}
		let l = n.map(e[t] + a), u = l - i;
		if (u < 0 || u >= r.content.size) {
			c = !0;
			continue;
		}
		let d = n.map(e[t + 1] + a, -1) - i, { index: f, offset: p } = r.content.findIndex(u), m = r.maybeChild(f);
		if (m && p == u && p + m.nodeSize == d) {
			let r = s[t + 2].mapInner(n, m, l + 1, e[t] + a + 1, o);
			r == H ? (s[t + 1] = -2, c = !0) : (s[t] = u, s[t + 1] = d, s[t + 2] = r);
		} else c = !0;
	}
	if (c) {
		let c = fs(ls(s, e, t, n, i, a, o), r, 0, o);
		t = c.local;
		for (let e = 0; e < s.length; e += 3) s[e + 1] < 0 && (s.splice(e, 3), e -= 3);
		for (let e = 0, t = 0; e < c.children.length; e += 3) {
			let n = c.children[e];
			for (; t < s.length && s[t] < n;) t += 3;
			s.splice(t, 0, c.children[e], c.children[e + 1], c.children[e + 2]);
		}
	}
	return new V(t.sort(ps), s);
}
function cs(e, t) {
	if (!t || !e.length) return e;
	let n = [];
	for (let r = 0; r < e.length; r++) {
		let i = e[r];
		n.push(new B(i.from + t, i.to + t, i.type));
	}
	return n;
}
function ls(e, t, n, r, i, a, o) {
	function s(e, t) {
		for (let a = 0; a < e.local.length; a++) {
			let s = e.local[a].map(r, i, t);
			s ? n.push(s) : o.onRemove && o.onRemove(e.local[a].spec);
		}
		for (let n = 0; n < e.children.length; n += 3) s(e.children[n + 2], e.children[n] + t + 1);
	}
	for (let n = 0; n < e.length; n += 3) e[n + 1] == -1 && s(e[n + 2], t[n] + a + 1);
	return n;
}
function us(e, t, n) {
	if (t.isLeaf) return null;
	let r = n + t.nodeSize, i = null;
	for (let t = 0, a; t < e.length; t++) (a = e[t]) && a.from > n && a.to < r && ((i || (i = [])).push(a), e[t] = null);
	return i;
}
function ds(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) e[n] != null && t.push(e[n]);
	return t;
}
function fs(e, t, n, r) {
	let i = [], a = !1;
	t.forEach((t, o) => {
		let s = us(e, t, o + n);
		if (s) {
			a = !0;
			let e = fs(s, t, n + o + 1, r);
			e != H && i.push(o, o + t.nodeSize, e);
		}
	});
	let o = cs(a ? ds(e) : e, -n).sort(ps);
	for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || (r.onRemove && r.onRemove(o[e].spec), o.splice(e--, 1));
	return o.length || i.length ? new V(o, i) : H;
}
function ps(e, t) {
	return e.from - t.from || e.to - t.to;
}
function ms(e) {
	let t = e;
	for (let n = 0; n < t.length - 1; n++) {
		let r = t[n];
		if (r.from != r.to) for (let i = n + 1; i < t.length; i++) {
			let a = t[i];
			if (a.from == r.from) {
				a.to != r.to && (t == e && (t = e.slice()), t[i] = a.copy(a.from, r.to), hs(t, i + 1, a.copy(r.to, a.to)));
				continue;
			}
			a.from < r.to && (t == e && (t = e.slice()), t[n] = r.copy(r.from, a.from), hs(t, i, r.copy(a.from, r.to)));
			break;
		}
	}
	return t;
}
function hs(e, t, n) {
	for (; t < e.length && ps(n, e[t]) > 0;) t++;
	e.splice(t, 0, n);
}
function gs(e) {
	let t = [];
	return e.someProp("decorations", (n) => {
		let r = n(e.state);
		r && r != H && t.push(r);
	}), e.cursorWrapper && t.push(V.create(e.state.doc, [e.cursorWrapper.deco])), as.from(t);
}
var _s = {
	childList: !0,
	characterData: !0,
	characterDataOldValue: !0,
	attributes: !0,
	attributeOldValue: !0,
	subtree: !0
}, vs = j && ti <= 11, ys = class {
	constructor() {
		this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
	}
	set(e) {
		this.anchorNode = e.anchorNode, this.anchorOffset = e.anchorOffset, this.focusNode = e.focusNode, this.focusOffset = e.focusOffset;
	}
	clear() {
		this.anchorNode = this.focusNode = null;
	}
	eq(e) {
		return e.anchorNode == this.anchorNode && e.anchorOffset == this.anchorOffset && e.focusNode == this.focusNode && e.focusOffset == this.focusOffset;
	}
}, bs = class {
	constructor(e, t) {
		this.view = e, this.handleDOMChange = t, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new ys(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((t) => {
			for (let e = 0; e < t.length; e++) this.queue.push(t[e]);
			j && ti <= 11 && t.some((e) => e.type == "childList" && e.removedNodes.length || e.type == "characterData" && e.oldValue.length > e.target.nodeValue.length) ? this.flushSoon() : P && e.composing && t.some((e) => e.type == "childList" && e.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
		}), vs && (this.onCharData = (e) => {
			this.queue.push({
				target: e.target,
				type: "characterData",
				oldValue: e.prevValue
			}), this.flushSoon();
		}), this.onSelectionChange = this.onSelectionChange.bind(this);
	}
	flushSoon() {
		this.flushingSoon < 0 && (this.flushingSoon = window.setTimeout(() => {
			this.flushingSoon = -1, this.flush();
		}, 20));
	}
	forceFlush() {
		this.flushingSoon > -1 && (window.clearTimeout(this.flushingSoon), this.flushingSoon = -1, this.flush());
	}
	start() {
		this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, _s)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
	}
	stop() {
		if (this.observer) {
			let e = this.observer.takeRecords();
			if (e.length) {
				for (let t = 0; t < e.length; t++) this.queue.push(e[t]);
				window.setTimeout(() => this.flush(), 20);
			}
			this.observer.disconnect();
		}
		this.onCharData && this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData), this.disconnectSelection();
	}
	connectSelection() {
		this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
	}
	disconnectSelection() {
		this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
	}
	suppressSelectionUpdates() {
		this.suppressingSelectionUpdates = !0, setTimeout(() => this.suppressingSelectionUpdates = !1, 50);
	}
	onSelectionChange() {
		if (Ea(this.view)) {
			if (this.suppressingSelectionUpdates) return ga(this.view);
			if (j && ti <= 11 && !this.view.state.selection.empty) {
				let e = this.view.domSelectionRange();
				if (e.focusNode && zr(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset)) return this.flushSoon();
			}
			this.flush();
		}
	}
	setCurSelection() {
		this.currentSelection.set(this.view.domSelectionRange());
	}
	ignoreSelectionChange(e) {
		if (!e.focusNode) return !0;
		let t = /* @__PURE__ */ new Set(), n;
		for (let n = e.focusNode; n; n = Fr(n)) t.add(n);
		for (let r = e.anchorNode; r; r = Fr(r)) if (t.has(r)) {
			n = r;
			break;
		}
		let r = n && this.view.docView.nearestDesc(n);
		if (r && r.ignoreMutation({
			type: "selection",
			target: n.nodeType == 3 ? n.parentNode : n
		})) return this.setCurSelection(), !0;
	}
	pendingRecords() {
		if (this.observer) for (let e of this.observer.takeRecords()) this.queue.push(e);
		return this.queue;
	}
	flush() {
		let { view: e } = this;
		if (!e.docView || this.flushingSoon > -1) return;
		let t = this.pendingRecords();
		t.length && (this.queue = []);
		let n = e.domSelectionRange(), r = !this.suppressingSelectionUpdates && !this.currentSelection.eq(n) && Ea(e) && !this.ignoreSelectionChange(n), i = -1, a = -1, o = !1, s = [];
		if (e.editable) for (let e = 0; e < t.length; e++) {
			let n = this.registerMutation(t[e], s);
			n && (i = i < 0 ? n.from : Math.min(n.from, i), a = a < 0 ? n.to : Math.max(n.to, a), n.typeOver && (o = !0));
		}
		if (s.some((e) => e.nodeName == "BR") && (e.input.lastKeyCode == 8 || e.input.lastKeyCode == 46 || N && (e.composing || e.input.compositionEndedAt > Date.now() - 50) && t.some((e) => e.type == "childList" && e.removedNodes.length))) {
			for (let e of s) if (e.nodeName == "BR" && e.parentNode) {
				let t = e.nextSibling;
				for (; t && t.nodeType == 1;) {
					if (t.contentEditable == "false") {
						e.parentNode.removeChild(e);
						break;
					}
					t = t.firstChild;
				}
			}
		} else if (M && s.length) {
			let t = s.filter((e) => e.nodeName == "BR");
			if (t.length == 2) {
				let [e, n] = t;
				e.parentNode && e.parentNode.parentNode == n.parentNode ? n.remove() : e.remove();
			} else {
				let { focusNode: n } = this.currentSelection;
				for (let r of t) {
					let t = r.parentNode;
					t && t.nodeName == "LI" && (!n || Es(e, n) != t) && r.remove();
				}
			}
		}
		let c = null;
		i < 0 && r && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && Kr(n) && (c = ma(e)) && c.eq(w.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, ga(e), this.currentSelection.set(n), e.scrollToSelection()) : (i > -1 || r) && (i > -1 && (e.docView.markDirty(i, a), Cs(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, Ds(e, s)), this.handleDOMChange(i, a, o, s), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(n) || ga(e), this.currentSelection.set(n));
	}
	registerMutation(e, t) {
		if (t.indexOf(e.target) > -1) return null;
		let n = this.view.docView.nearestDesc(e.target);
		if (e.type == "attributes" && (n == this.view.docView || e.attributeName == "contenteditable" || e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !n || n.ignoreMutation(e)) return null;
		if (e.type == "childList") {
			for (let n = 0; n < e.addedNodes.length; n++) {
				let r = e.addedNodes[n];
				t.push(r), r.nodeType == 3 && (this.lastChangedTextNode = r);
			}
			if (n.contentDOM && n.contentDOM != n.dom && !n.contentDOM.contains(e.target)) return {
				from: n.posBefore,
				to: n.posAfter
			};
			let r = e.previousSibling, i = e.nextSibling;
			if (j && ti <= 11 && e.addedNodes.length) for (let t = 0; t < e.addedNodes.length; t++) {
				let { previousSibling: n, nextSibling: a } = e.addedNodes[t];
				(!n || Array.prototype.indexOf.call(e.addedNodes, n) < 0) && (r = n), (!a || Array.prototype.indexOf.call(e.addedNodes, a) < 0) && (i = a);
			}
			let a = r && r.parentNode == e.target ? O(r) + 1 : 0, o = n.localPosFromDOM(e.target, a, -1), s = i && i.parentNode == e.target ? O(i) : e.target.childNodes.length;
			return {
				from: o,
				to: n.localPosFromDOM(e.target, s, 1)
			};
		}
		return e.type == "attributes" ? {
			from: n.posAtStart - n.border,
			to: n.posAtEnd + n.border
		} : (this.lastChangedTextNode = e.target, {
			from: n.posAtStart,
			to: n.posAtEnd,
			typeOver: e.target.nodeValue == e.oldValue
		});
	}
}, xs = /* @__PURE__ */ new WeakMap(), Ss = !1;
function Cs(e) {
	if (!xs.has(e) && (xs.set(e, null), [
		"normal",
		"nowrap",
		"pre-line"
	].indexOf(getComputedStyle(e.dom).whiteSpace) !== -1)) {
		if (e.requiresGeckoHackNode = M, Ss) return;
		console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), Ss = !0;
	}
}
function ws(e, t) {
	let n = t.startContainer, r = t.startOffset, i = t.endContainer, a = t.endOffset, o = e.domAtPos(e.state.selection.anchor);
	return zr(o.node, o.offset, i, a) && ([n, r, i, a] = [
		i,
		a,
		n,
		r
	]), {
		anchorNode: n,
		anchorOffset: r,
		focusNode: i,
		focusOffset: a
	};
}
function Ts(e, t) {
	if (t.getComposedRanges) {
		let n = t.getComposedRanges(e.root)[0];
		if (n) return ws(e, n);
	}
	let n;
	function r(e) {
		e.preventDefault(), e.stopImmediatePropagation(), n = e.getTargetRanges()[0];
	}
	return e.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), e.dom.removeEventListener("beforeinput", r, !0), n ? ws(e, n) : null;
}
function Es(e, t) {
	for (let n = t.parentNode; n && n != e.dom; n = n.parentNode) {
		let t = e.docView.nearestDesc(n, !0);
		if (t && t.node.isBlock) return n;
	}
	return null;
}
function Ds(e, t) {
	let { focusNode: n, focusOffset: r } = e.domSelectionRange();
	for (let i of t) if (i.parentNode?.nodeName == "TR") {
		let t = i.nextSibling;
		for (; t && t.nodeName != "TD" && t.nodeName != "TH";) t = t.nextSibling;
		if (t) {
			let a = t;
			for (;;) {
				let e = a.firstChild;
				if (!e || e.nodeType != 1 || e.contentEditable == "false" || /^(BR|IMG)$/.test(e.nodeName)) break;
				a = e;
			}
			a.insertBefore(i, a.firstChild), n == i && e.domSelection().collapse(i, r);
		} else i.parentNode.removeChild(i);
	}
}
function Os(e, t, n, r) {
	let { node: i, fromOffset: a, toOffset: o, from: s, to: c } = e.docView.parseRange(t, n), l = e.domSelectionRange(), u, d = l.anchorNode;
	if (d && e.dom.contains(d.nodeType == 1 ? d : d.parentNode) && (u = [{
		node: d,
		offset: l.anchorOffset
	}], Kr(l) || u.push({
		node: l.focusNode,
		offset: l.focusOffset
	})), N && e.input.lastKeyCode === 8) for (let e = o; e > a; e--) {
		let t = i.childNodes[e - 1], n = t.pmViewDesc;
		if (t.nodeName == "BR" && !n) {
			o = e;
			break;
		}
		if (!n || n.size) break;
	}
	let f = e.state.doc, p = e.someProp("domParser") || Re.fromSchema(e.state.schema), m = f.resolve(s), h = null, g = p.parse(i, {
		topNode: m.parent,
		topMatch: m.parent.contentMatchAt(m.index()),
		topOpen: !0,
		from: a,
		to: o,
		preserveWhitespace: m.parent.type.whitespace != "pre" || "full",
		findPositions: u,
		ruleFromNode: ks(r),
		context: m
	});
	if (u && u[0].pos != null) {
		let e = u[0].pos, t = u[1] && u[1].pos;
		t ?? (t = e), h = {
			anchor: e + s,
			head: t + s
		};
	}
	return {
		doc: g,
		sel: h,
		from: s,
		to: c
	};
}
var ks = (e) => (t) => {
	let n = t.pmViewDesc;
	if (n) return n.parseRule(e);
	if (t.nodeName == "BR" && t.parentNode) {
		if (P && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
			let e = document.createElement("div");
			return e.appendChild(document.createElement("li")), { skip: e };
		}
		if (t.parentNode.lastChild == t || P && /^(tr|table)$/i.test(t.parentNode.nodeName)) return { ignore: !0 };
	} else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder")) return { ignore: !0 };
	return null;
}, As = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function js(e, t, n, r, i) {
	let a = e.input.compositionPendingChanges || (e.composing ? e.input.compositionID : 0);
	if (e.input.compositionPendingChanges = 0, t < 0) {
		let t = e.input.lastSelectionTime > Date.now() - 50 ? e.input.lastSelectionOrigin : null, n = ma(e, t);
		if (n && !e.state.selection.eq(n)) {
			if (N && oi && e.input.lastKeyCode === 13 && Date.now() - 100 < e.input.lastKeyCodeTime && e.someProp("handleKeyDown", (t) => t(e, qr(13, "Enter")))) return;
			let r = e.state.tr.setSelection(n);
			t == "pointer" ? r.setMeta("pointer", !0) : t == "key" && r.scrollIntoView(), a && r.setMeta("composition", a), e.dispatch(r);
		}
		return;
	}
	let o = e.state.doc.resolve(t), s = o.sharedDepth(n);
	t = o.before(s + 1), n = e.state.doc.resolve(n).after(s + 1);
	let c = e.state.selection, l = Os(e, t, n, i), u = e.state.doc, d = u.slice(l.from, l.to), f, p;
	e.input.lastKeyCode === 8 && Date.now() - 100 < e.input.lastKeyCodeTime ? (f = e.state.selection.to, p = "end") : (f = e.state.selection.from, p = "start"), e.input.lastKeyCode = null;
	let m = Is(d.content, l.doc.content, l.from, f, p);
	if (m && e.input.domChangeCount++, (ii && e.input.lastIOSEnter > Date.now() - 225 || oi) && i.some((e) => e.nodeType == 1 && !As.test(e.nodeName)) && (!m || m.endA >= m.endB) && e.someProp("handleKeyDown", (t) => t(e, qr(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (!m) {
		if (r && c instanceof T && !c.empty && c.$head.sameParent(c.$anchor) && !e.composing && !(l.sel && l.sel.anchor != l.sel.head)) m = {
			start: c.from,
			endA: c.to,
			endB: c.to
		};
		else {
			if (l.sel) {
				let t = Ms(e, e.state.doc, l.sel);
				if (t && !t.eq(e.state.selection)) {
					let n = e.state.tr.setSelection(t);
					a && n.setMeta("composition", a), e.dispatch(n);
				}
			}
			return;
		}
	}
	e.state.selection.from < e.state.selection.to && m.start == m.endB && e.state.selection instanceof T && (m.start > e.state.selection.from && m.start <= e.state.selection.from + 2 && e.state.selection.from >= l.from ? m.start = e.state.selection.from : m.endA < e.state.selection.to && m.endA >= e.state.selection.to - 2 && e.state.selection.to <= l.to && (m.endB += e.state.selection.to - m.endA, m.endA = e.state.selection.to)), j && ti <= 11 && m.endB == m.start + 1 && m.endA == m.start && m.start > l.from && l.doc.textBetween(m.start - l.from - 1, m.start - l.from + 1) == " \xA0" && (m.start--, m.endA--, m.endB--);
	let h = l.doc.resolveNoCache(m.start - l.from), g = l.doc.resolveNoCache(m.endB - l.from), _ = u.resolve(m.start), v = h.sameParent(g) && h.parent.inlineContent && _.end() >= m.endA;
	if ((ii && e.input.lastIOSEnter > Date.now() - 225 && (!v || i.some((e) => e.nodeName == "DIV" || e.nodeName == "P")) || !v && h.pos < l.doc.content.size && (!h.sameParent(g) || !h.parent.inlineContent) && h.pos < g.pos && !/\S/.test(l.doc.textBetween(h.pos, g.pos, "", ""))) && e.someProp("handleKeyDown", (t) => t(e, qr(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (e.state.selection.anchor > m.start && Ps(u, m.start, m.endA, h, g) && e.someProp("handleKeyDown", (t) => t(e, qr(8, "Backspace")))) {
		oi && N && e.domObserver.suppressSelectionUpdates();
		return;
	}
	N && m.endB == m.start && (e.input.lastChromeDelete = Date.now()), oi && !v && h.start() != g.start() && g.parentOffset == 0 && h.depth == g.depth && l.sel && l.sel.anchor == l.sel.head && l.sel.head == m.endA && (m.endB -= 2, g = l.doc.resolveNoCache(m.endB - l.from), setTimeout(() => {
		e.someProp("handleKeyDown", function(t) {
			return t(e, qr(13, "Enter"));
		});
	}, 20));
	let y = m.start, b = m.endA, ee = (t) => {
		let n = t || e.state.tr.replace(y, b, l.doc.slice(m.start - l.from, m.endB - l.from));
		if (l.sel) {
			let t = Ms(e, n.doc, l.sel);
			t && !(N && e.composing && t.empty && (m.start != m.endB || e.input.lastChromeDelete < Date.now() - 100) && (t.head == y || t.head == n.mapping.map(b) - 1) || j && t.empty && t.head == y) && n.setSelection(t);
		}
		return a && n.setMeta("composition", a), n.scrollIntoView();
	}, te;
	if (v) {
		if (h.pos == g.pos) {
			j && ti <= 11 && h.parentOffset == 0 && (e.domObserver.suppressSelectionUpdates(), setTimeout(() => ga(e), 20));
			let t = ee(e.state.tr.delete(y, b)), n = u.resolve(m.start).marksAcross(u.resolve(m.endA));
			n && t.ensureMarks(n), e.dispatch(t);
		} else if (m.endA == m.endB && (te = Ns(h.parent.content.cut(h.parentOffset, g.parentOffset), _.parent.content.cut(_.parentOffset, m.endA - _.start())))) {
			let t = ee(e.state.tr);
			te.type == "add" ? t.addMark(y, b, te.mark) : t.removeMark(y, b, te.mark), e.dispatch(t);
		} else if (h.parent.child(h.index()).isText && h.index() == g.index() - +!g.textOffset) {
			let t = h.parent.textBetween(h.parentOffset, g.parentOffset), n = () => ee(e.state.tr.insertText(t, y, b));
			e.someProp("handleTextInput", (r) => r(e, y, b, t, n)) || e.dispatch(n());
		} else e.dispatch(ee());
	} else e.dispatch(ee());
}
function Ms(e, t, n) {
	return Math.max(n.anchor, n.head) > t.content.size ? null : Ta(e, t.resolve(n.anchor), t.resolve(n.head));
}
function Ns(e, t) {
	let n = e.firstChild.marks, r = t.firstChild.marks, i = n, o = r, s, c, l;
	for (let e = 0; e < r.length; e++) i = r[e].removeFromSet(i);
	for (let e = 0; e < n.length; e++) o = n[e].removeFromSet(o);
	if (i.length == 1 && o.length == 0) c = i[0], s = "add", l = (e) => e.mark(c.addToSet(e.marks));
	else if (i.length == 0 && o.length == 1) c = o[0], s = "remove", l = (e) => e.mark(c.removeFromSet(e.marks));
	else return null;
	let u = [];
	for (let e = 0; e < t.childCount; e++) u.push(l(t.child(e)));
	if (a.from(u).eq(e)) return {
		mark: c,
		type: s
	};
}
function Ps(e, t, n, r, i) {
	if (n - t <= i.pos - r.pos || Fs(r, !0, !1) < i.pos) return !1;
	let a = e.resolve(t);
	if (!r.parent.isTextblock) {
		let e = a.nodeAfter;
		return e != null && n == t + e.nodeSize;
	}
	if (a.parentOffset < a.parent.content.size || !a.parent.isTextblock) return !1;
	let o = e.resolve(Fs(a, !0, !0));
	return !o.parent.isTextblock || o.pos > n || Fs(o, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(o.parent.content);
}
function Fs(e, t, n) {
	let r = e.depth, i = t ? e.end() : e.pos;
	for (; r > 0 && (t || e.indexAfter(r) == e.node(r).childCount);) r--, i++, t = !1;
	if (n) {
		let t = e.node(r).maybeChild(e.indexAfter(r));
		for (; t && !t.isLeaf;) t = t.firstChild, i++;
	}
	return i;
}
function Is(e, t, n, r, i) {
	let a = e.findDiffStart(t, n), o = n + e.size, s = n + t.size;
	if (a == null) return null;
	let { a: c, b: l } = e.findDiffEnd(t, o, s);
	if (i == "end") {
		let e = Math.max(0, a - Math.min(c, l));
		r -= c + e - a;
	}
	if (c < a && o < s) {
		let e = r <= a && r >= c ? a - r : 0;
		a -= e, l = a + (l - c), c = a;
	} else if (l < a) {
		let e = r <= a && r >= l ? a - r : 0;
		a -= e, c = a + (c - l), l = a;
	}
	return {
		start: a,
		endA: c,
		endB: l
	};
}
var Ls = class {
	constructor(e, t) {
		this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new fo(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = t, this.state = t.state, this.directPlugins = t.plugins || [], this.directPlugins.forEach(Ws), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = Bs(this), zs(this), this.nodeViews = Hs(this), this.docView = Ji(this.state.doc, Rs(this), gs(this), this.dom, this), this.domObserver = new bs(this, (e, t, n, r) => js(this, e, t, n, r)), this.domObserver.start(), po(this), this.updatePluginViews();
	}
	get composing() {
		return this.input.composing;
	}
	get props() {
		if (this._props.state != this.state) {
			let e = this._props;
			this._props = {};
			for (let t in e) this._props[t] = e[t];
			this._props.state = this.state;
		}
		return this._props;
	}
	update(e) {
		e.handleDOMEvents != this._props.handleDOMEvents && go(this);
		let t = this._props;
		this._props = e, e.plugins && (e.plugins.forEach(Ws), this.directPlugins = e.plugins), this.updateStateInner(e.state, t);
	}
	setProps(e) {
		let t = {};
		for (let e in this._props) t[e] = this._props[e];
		t.state = this.state;
		for (let n in e) t[n] = e[n];
		this.update(t);
	}
	updateState(e) {
		this.updateStateInner(e, this._props);
	}
	updateStateInner(e, t) {
		let n = this.state, r = !1, i = !1;
		e.storedMarks && this.composing && (Bo(this), i = !0), this.state = e;
		let a = n.plugins != e.plugins || this._props.plugins != t.plugins;
		if (a || this._props.plugins != t.plugins || this._props.nodeViews != t.nodeViews) {
			let e = Hs(this);
			Us(e, this.nodeViews) && (this.nodeViews = e, r = !0);
		}
		(a || t.handleDOMEvents != this._props.handleDOMEvents) && go(this), this.editable = Bs(this), zs(this);
		let o = gs(this), s = Rs(this), c = n.plugins != e.plugins && !n.doc.eq(e.doc) ? "reset" : e.scrollToSelection > n.scrollToSelection ? "to selection" : "preserve", l = r || !this.docView.matchesNode(e.doc, s, o);
		(l || !e.selection.eq(n.selection)) && (i = !0);
		let u = c == "preserve" && i && this.dom.style.overflowAnchor == null && pi(this);
		if (i) {
			this.domObserver.stop();
			let t = l && (j || N) && !this.composing && !n.selection.empty && !e.selection.empty && Vs(n.selection, e.selection);
			if (l) {
				let n = N ? this.trackWrites = this.domSelectionRange().focusNode : null;
				this.composing && (this.input.compositionNode = Vo(this)), (r || !this.docView.update(e.doc, s, o, this)) && (this.docView.updateOuterDeco(s), this.docView.destroy(), this.docView = Ji(e.doc, s, o, this.dom, this)), n && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (t = !0);
			}
			let i = this.input.mouseDown;
			t || !(i && this.domObserver.currentSelection.eq(this.domSelectionRange()) && Oa(this) && i.delaySelUpdate()) ? ga(this, t) : (Ca(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
		}
		this.updatePluginViews(n), this.dragging?.node && !n.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, n), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : u && hi(u);
	}
	scrollToSelection() {
		let e = this.domSelectionRange().focusNode;
		if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode)) && !this.someProp("handleScrollToSelection", (e) => e(this))) {
			if (this.state.selection instanceof E) {
				let t = this.docView.domAfterPos(this.state.selection.from);
				t.nodeType == 1 && fi(this, t.getBoundingClientRect(), e);
			} else fi(this, this.coordsAtPos(this.state.selection.head, 1), e);
		}
	}
	destroyPluginViews() {
		let e;
		for (; e = this.pluginViews.pop();) e.destroy && e.destroy();
	}
	updatePluginViews(e) {
		if (!e || e.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
			this.prevDirectPlugins = this.directPlugins, this.destroyPluginViews();
			for (let e = 0; e < this.directPlugins.length; e++) {
				let t = this.directPlugins[e];
				t.spec.view && this.pluginViews.push(t.spec.view(this));
			}
			for (let e = 0; e < this.state.plugins.length; e++) {
				let t = this.state.plugins[e];
				t.spec.view && this.pluginViews.push(t.spec.view(this));
			}
		} else for (let t = 0; t < this.pluginViews.length; t++) {
			let n = this.pluginViews[t];
			n.update && n.update(this, e);
		}
	}
	updateDraggedNode(e, t) {
		let n = e.node, r = -1;
		if (n.from < this.state.doc.content.size && this.state.doc.nodeAt(n.from) == n.node) r = n.from;
		else {
			let e = n.from + (this.state.doc.content.size - t.doc.content.size);
			(e > 0 && e < this.state.doc.content.size && this.state.doc.nodeAt(e)) == n.node && (r = e);
		}
		this.dragging = new Yo(e.slice, e.move, r < 0 ? void 0 : E.create(this.state.doc, r));
	}
	someProp(e, t) {
		let n = this._props && this._props[e], r;
		if (n != null && (r = t ? t(n) : n)) return r;
		for (let n = 0; n < this.directPlugins.length; n++) {
			let i = this.directPlugins[n].props[e];
			if (i != null && (r = t ? t(i) : i)) return r;
		}
		let i = this.state.plugins;
		if (i) for (let n = 0; n < i.length; n++) {
			let a = i[n].props[e];
			if (a != null && (r = t ? t(a) : a)) return r;
		}
	}
	hasFocus() {
		if (j) {
			let e = this.root.activeElement;
			if (e == this.dom) return !0;
			if (!e || !this.dom.contains(e)) return !1;
			for (; e && this.dom != e && this.dom.contains(e);) {
				if (e.contentEditable == "false") return !1;
				e = e.parentElement;
			}
			return !0;
		}
		return this.root.activeElement == this.dom;
	}
	focus() {
		this.domObserver.stop(), this.editable && vi(this.dom), ga(this), this.domObserver.start();
	}
	get root() {
		let e = this._root;
		if (e == null) {
			for (let e = this.dom.parentNode; e; e = e.parentNode) if (e.nodeType == 9 || e.nodeType == 11 && e.host) return e.getSelection || (Object.getPrototypeOf(e).getSelection = () => e.ownerDocument.getSelection()), this._root = e;
		}
		return e || document;
	}
	updateRoot() {
		this._root = null;
	}
	posAtCoords(e) {
		return Ei(this, e);
	}
	coordsAtPos(e, t = 1) {
		return Ai(this, e, t);
	}
	domAtPos(e, t = 0) {
		return this.docView.domFromPos(e, t);
	}
	nodeDOM(e) {
		let t = this.docView.descAt(e);
		return t ? t.nodeDOM : null;
	}
	posAtDOM(e, t, n = -1) {
		let r = this.docView.posFromDOM(e, t, n);
		if (r == null) throw RangeError("DOM position not inside the editor");
		return r;
	}
	endOfTextblock(e, t) {
		return Bi(this, t || this.state, e);
	}
	pasteHTML(e, t) {
		return qo(this, "", e, !1, t || new ClipboardEvent("paste"));
	}
	pasteText(e, t) {
		return qo(this, e, null, !0, t || new ClipboardEvent("paste"));
	}
	serializeForClipboard(e) {
		return Ja(this, e);
	}
	destroy() {
		this.docView && (ho(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], gs(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, Rr());
	}
	get isDestroyed() {
		return this.docView == null;
	}
	dispatchEvent(e) {
		return yo(this, e);
	}
	domSelectionRange() {
		let e = this.domSelection();
		return e ? P && this.root.nodeType === 11 && Jr(this.dom.ownerDocument) == this.dom && Ts(this, e) || e : {
			focusNode: null,
			focusOffset: 0,
			anchorNode: null,
			anchorOffset: 0
		};
	}
	domSelection() {
		return this.root.getSelection();
	}
};
Ls.prototype.dispatch = function(e) {
	let t = this._props.dispatchTransaction;
	t ? t.call(this, e) : this.updateState(this.state.apply(e));
};
function Rs(e) {
	let t = Object.create(null);
	return t.class = "ProseMirror", t.contenteditable = String(e.editable), e.someProp("attributes", (n) => {
		if (typeof n == "function" && (n = n(e.state)), n) for (let e in n) e == "class" ? t.class += " " + n[e] : e == "style" ? t.style = (t.style ? t.style + ";" : "") + n[e] : !t[e] && e != "contenteditable" && e != "nodeName" && (t[e] = String(n[e]));
	}), t.translate || (t.translate = "no"), [B.node(0, e.state.doc.content.size, t)];
}
function zs(e) {
	if (e.markCursor) {
		let t = document.createElement("img");
		t.className = "ProseMirror-separator", t.setAttribute("mark-placeholder", "true"), t.setAttribute("alt", ""), e.cursorWrapper = {
			dom: t,
			deco: B.widget(e.state.selection.from, t, {
				raw: !0,
				marks: e.markCursor
			})
		};
	} else e.cursorWrapper = null;
}
function Bs(e) {
	return !e.someProp("editable", (t) => t(e.state) === !1);
}
function Vs(e, t) {
	let n = Math.min(e.$anchor.sharedDepth(e.head), t.$anchor.sharedDepth(t.head));
	return e.$anchor.start(n) != t.$anchor.start(n);
}
function Hs(e) {
	let t = Object.create(null);
	function n(e) {
		for (let n in e) Object.prototype.hasOwnProperty.call(t, n) || (t[n] = e[n]);
	}
	return e.someProp("nodeViews", n), e.someProp("markViews", n), t;
}
function Us(e, t) {
	let n = 0, r = 0;
	for (let r in e) {
		if (e[r] != t[r]) return !0;
		n++;
	}
	for (let e in t) r++;
	return n != r;
}
function Ws(e) {
	if (e.spec.state || e.spec.filterTransaction || e.spec.appendTransaction) throw RangeError("Plugins passed directly to the view must not have a state component");
}
//#endregion
//#region node_modules/prosemirror-gapcursor/dist/index.js
var U = class e extends w {
	constructor(e) {
		super(e, e);
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		return e.valid(r) ? new e(r) : w.near(r);
	}
	content() {
		return d.empty;
	}
	eq(t) {
		return t instanceof e && t.head == this.head;
	}
	toJSON() {
		return {
			type: "gapcursor",
			pos: this.head
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for GapCursor.fromJSON");
		return new e(t.resolve(n.pos));
	}
	getBookmark() {
		return new Gs(this.anchor);
	}
	static valid(e) {
		let t = e.parent;
		if (t.inlineContent || !qs(e) || !Js(e)) return !1;
		let n = t.type.spec.allowGapCursor;
		if (n != null) return n;
		let r = t.contentMatchAt(e.index()).defaultType;
		return r && r.isTextblock;
	}
	static findGapCursorFrom(t, n, r = !1) {
		search: for (;;) {
			if (!r && e.valid(t)) return t;
			let i = t.pos, a = null;
			for (let r = t.depth;; r--) {
				let o = t.node(r);
				if (n > 0 ? t.indexAfter(r) < o.childCount : t.index(r) > 0) {
					a = o.child(n > 0 ? t.indexAfter(r) : t.index(r) - 1);
					break;
				}
				if (r == 0) return null;
				i += n;
				let s = t.doc.resolve(i);
				if (e.valid(s)) return s;
			}
			for (;;) {
				let o = n > 0 ? a.firstChild : a.lastChild;
				if (!o) {
					if (a.isAtom && !a.isText && !E.isSelectable(a)) {
						t = t.doc.resolve(i + a.nodeSize * n), r = !1;
						continue search;
					}
					break;
				}
				a = o, i += n;
				let s = t.doc.resolve(i);
				if (e.valid(s)) return s;
			}
			return null;
		}
	}
};
U.prototype.visible = !1, U.findFrom = U.findGapCursorFrom, w.jsonID("gapcursor", U);
var Gs = class e {
	constructor(e) {
		this.pos = e;
	}
	map(t) {
		return new e(t.map(this.pos));
	}
	resolve(e) {
		let t = e.resolve(this.pos);
		return U.valid(t) ? new U(t) : w.near(t);
	}
};
function Ks(e) {
	return e.isAtom || e.spec.isolating || e.spec.createGapCursor;
}
function qs(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.index(t), r = e.node(t);
		if (n == 0) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n - 1);; e = e.lastChild) {
			if (e.childCount == 0 && !e.inlineContent || Ks(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function Js(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.indexAfter(t), r = e.node(t);
		if (n == r.childCount) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n);; e = e.firstChild) {
			if (e.childCount == 0 && !e.inlineContent || Ks(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function Ys() {
	return new Fn({ props: {
		decorations: ec,
		createSelectionBetween(e, t, n) {
			return t.pos == n.pos && U.valid(n) ? new U(n) : null;
		},
		handleClick: Qs,
		handleKeyDown: Xs,
		handleDOMEvents: { beforeinput: $s }
	} });
}
var Xs = Pr({
	ArrowLeft: Zs("horiz", -1),
	ArrowRight: Zs("horiz", 1),
	ArrowUp: Zs("vert", -1),
	ArrowDown: Zs("vert", 1)
});
function Zs(e, t) {
	let n = e == "vert" ? t > 0 ? "down" : "up" : t > 0 ? "right" : "left";
	return function(e, r, i) {
		let a = e.selection, o = t > 0 ? a.$to : a.$from, s = a.empty;
		if (a instanceof T) {
			if (!i.endOfTextblock(n) || o.depth == 0) return !1;
			s = !1, o = e.doc.resolve(t > 0 ? o.after() : o.before());
		}
		let c = U.findGapCursorFrom(o, t, s);
		return c ? (r && r(e.tr.setSelection(new U(c))), !0) : !1;
	};
}
function Qs(e, t, n) {
	if (!e || !e.editable) return !1;
	let r = e.state.doc.resolve(t);
	if (!U.valid(r)) return !1;
	let i = e.posAtCoords({
		left: n.clientX,
		top: n.clientY
	});
	return i && i.inside > -1 && E.isSelectable(e.state.doc.nodeAt(i.inside)) ? !1 : (e.dispatch(e.state.tr.setSelection(new U(r))), !0);
}
function $s(e, t) {
	if (t.inputType != "insertCompositionText" || !(e.state.selection instanceof U)) return !1;
	let { $from: n } = e.state.selection, r = n.parent.contentMatchAt(n.index()).findWrapping(e.state.schema.nodes.text);
	if (!r) return !1;
	let i = a.empty;
	for (let e = r.length - 1; e >= 0; e--) i = a.from(r[e].createAndFill(null, i));
	let o = e.state.tr.replace(n.pos, n.pos, new d(i, 0, 0));
	return o.setSelection(T.near(o.doc.resolve(n.pos + 1))), e.dispatch(o), !1;
}
function ec(e) {
	if (!(e.selection instanceof U)) return null;
	let t = document.createElement("div");
	return t.className = "ProseMirror-gapcursor", V.create(e.doc, [B.widget(e.selection.head, t, { key: "gapcursor" })]);
}
//#endregion
//#region node_modules/rope-sequence/dist/index.js
var tc = 200, W = function() {};
W.prototype.append = function(e) {
	return e.length ? (e = W.from(e), !this.length && e || e.length < tc && this.leafAppend(e) || this.length < tc && e.leafPrepend(this) || this.appendInner(e)) : this;
}, W.prototype.prepend = function(e) {
	return e.length ? W.from(e).append(this) : this;
}, W.prototype.appendInner = function(e) {
	return new rc(this, e);
}, W.prototype.slice = function(e, t) {
	return e === void 0 && (e = 0), t === void 0 && (t = this.length), e >= t ? W.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, t));
}, W.prototype.get = function(e) {
	if (!(e < 0 || e >= this.length)) return this.getInner(e);
}, W.prototype.forEach = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length), t <= n ? this.forEachInner(e, t, n, 0) : this.forEachInvertedInner(e, t, n, 0);
}, W.prototype.map = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length);
	var r = [];
	return this.forEach(function(t, n) {
		return r.push(e(t, n));
	}, t, n), r;
}, W.from = function(e) {
	return e instanceof W ? e : e && e.length ? new nc(e) : W.empty;
};
var nc = /* @__PURE__ */ function(e) {
	function t(t) {
		e.call(this), this.values = t;
	}
	e && (t.__proto__ = e), t.prototype = Object.create(e && e.prototype), t.prototype.constructor = t;
	var n = {
		length: { configurable: !0 },
		depth: { configurable: !0 }
	};
	return t.prototype.flatten = function() {
		return this.values;
	}, t.prototype.sliceInner = function(e, n) {
		return e == 0 && n == this.length ? this : new t(this.values.slice(e, n));
	}, t.prototype.getInner = function(e) {
		return this.values[e];
	}, t.prototype.forEachInner = function(e, t, n, r) {
		for (var i = t; i < n; i++) if (e(this.values[i], r + i) === !1) return !1;
	}, t.prototype.forEachInvertedInner = function(e, t, n, r) {
		for (var i = t - 1; i >= n; i--) if (e(this.values[i], r + i) === !1) return !1;
	}, t.prototype.leafAppend = function(e) {
		if (this.length + e.length <= tc) return new t(this.values.concat(e.flatten()));
	}, t.prototype.leafPrepend = function(e) {
		if (this.length + e.length <= tc) return new t(e.flatten().concat(this.values));
	}, n.length.get = function() {
		return this.values.length;
	}, n.depth.get = function() {
		return 0;
	}, Object.defineProperties(t.prototype, n), t;
}(W);
W.empty = new nc([]);
var rc = /* @__PURE__ */ function(e) {
	function t(t, n) {
		e.call(this), this.left = t, this.right = n, this.length = t.length + n.length, this.depth = Math.max(t.depth, n.depth) + 1;
	}
	return e && (t.__proto__ = e), t.prototype = Object.create(e && e.prototype), t.prototype.constructor = t, t.prototype.flatten = function() {
		return this.left.flatten().concat(this.right.flatten());
	}, t.prototype.getInner = function(e) {
		return e < this.left.length ? this.left.get(e) : this.right.get(e - this.left.length);
	}, t.prototype.forEachInner = function(e, t, n, r) {
		var i = this.left.length;
		if (t < i && this.left.forEachInner(e, t, Math.min(n, i), r) === !1 || n > i && this.right.forEachInner(e, Math.max(t - i, 0), Math.min(this.length, n) - i, r + i) === !1) return !1;
	}, t.prototype.forEachInvertedInner = function(e, t, n, r) {
		var i = this.left.length;
		if (t > i && this.right.forEachInvertedInner(e, t - i, Math.max(n, i) - i, r + i) === !1 || n < i && this.left.forEachInvertedInner(e, Math.min(t, i), n, r) === !1) return !1;
	}, t.prototype.sliceInner = function(e, t) {
		if (e == 0 && t == this.length) return this;
		var n = this.left.length;
		return t <= n ? this.left.slice(e, t) : e >= n ? this.right.slice(e - n, t - n) : this.left.slice(e, n).append(this.right.slice(0, t - n));
	}, t.prototype.leafAppend = function(e) {
		var n = this.right.leafAppend(e);
		if (n) return new t(this.left, n);
	}, t.prototype.leafPrepend = function(e) {
		var n = this.left.leafPrepend(e);
		if (n) return new t(n, this.right);
	}, t.prototype.appendInner = function(e) {
		return this.left.depth >= Math.max(this.right.depth, e.depth) + 1 ? new t(this.left, new t(this.right, e)) : new t(this, e);
	}, t;
}(W), ic = 500, ac = class e {
	constructor(e, t) {
		this.items = e, this.eventCount = t;
	}
	popEvent(t, n) {
		if (this.eventCount == 0) return null;
		let r = this.items.length;
		for (;; r--) if (this.items.get(r - 1).selection) {
			--r;
			break;
		}
		let i, a;
		n && (i = this.remapping(r, this.items.length), a = i.maps.length);
		let o = t.tr, s, c, l = [], u = [];
		return this.items.forEach((t, n) => {
			if (!t.step) {
				i || (i = this.remapping(r, n + 1), a = i.maps.length), a--, u.push(t);
				return;
			}
			if (i) {
				u.push(new sc(t.map));
				let e = t.step.map(i.slice(a)), n;
				e && o.maybeStep(e).doc && (n = o.mapping.maps[o.mapping.maps.length - 1], l.push(new sc(n, void 0, void 0, l.length + u.length))), a--, n && i.appendMap(n, a);
			} else o.maybeStep(t.step);
			if (t.selection) return s = i ? t.selection.map(i.slice(a)) : t.selection, c = new e(this.items.slice(0, r).append(u.reverse().concat(l)), this.eventCount - 1), !1;
		}, this.items.length, 0), {
			remaining: c,
			transform: o,
			selection: s
		};
	}
	addTransform(t, n, r, i) {
		let a = [], o = this.eventCount, s = this.items, c = !i && s.length ? s.get(s.length - 1) : null;
		for (let e = 0; e < t.steps.length; e++) {
			let r = t.steps[e].invert(t.docs[e]), l = new sc(t.mapping.maps[e], r, n), u;
			(u = c && c.merge(l)) && (l = u, e ? a.pop() : s = s.slice(0, s.length - 1)), a.push(l), n && (o++, n = void 0), i || (c = l);
		}
		let l = o - r.depth;
		return l > lc && (s = oc(s, l), o -= l), new e(s.append(a), o);
	}
	remapping(e, t) {
		let n = new gt();
		return this.items.forEach((t, r) => {
			let i = t.mirrorOffset != null && r - t.mirrorOffset >= e ? n.maps.length - t.mirrorOffset : void 0;
			n.appendMap(t.map, i);
		}, e, t), n;
	}
	addMaps(t) {
		return this.eventCount == 0 ? this : new e(this.items.append(t.map((e) => new sc(e))), this.eventCount);
	}
	rebased(t, n) {
		if (!this.eventCount) return this;
		let r = [], i = Math.max(0, this.items.length - n), a = t.mapping, o = t.steps.length, s = this.eventCount;
		this.items.forEach((e) => {
			e.selection && s--;
		}, i);
		let c = n;
		this.items.forEach((e) => {
			let n = a.getMirror(--c);
			if (n == null) return;
			o = Math.min(o, n);
			let i = a.maps[n];
			if (e.step) {
				let o = t.steps[n].invert(t.docs[n]), l = e.selection && e.selection.map(a.slice(c + 1, n));
				l && s++, r.push(new sc(i, o, l));
			} else r.push(new sc(i));
		}, i);
		let l = [];
		for (let e = n; e < o; e++) l.push(new sc(a.maps[e]));
		let u = this.items.slice(0, i).append(l).append(r), d = new e(u, s);
		return d.emptyItemCount() > ic && (d = d.compress(this.items.length - r.length)), d;
	}
	emptyItemCount() {
		let e = 0;
		return this.items.forEach((t) => {
			t.step || e++;
		}), e;
	}
	compress(t = this.items.length) {
		let n = this.remapping(0, t), r = n.maps.length, i = [], a = 0;
		return this.items.forEach((e, o) => {
			if (o >= t) i.push(e), e.selection && a++;
			else if (e.step) {
				let t = e.step.map(n.slice(r)), o = t && t.getMap();
				if (r--, o && n.appendMap(o, r), t) {
					let s = e.selection && e.selection.map(n.slice(r));
					s && a++;
					let c = new sc(o.invert(), t, s), l, u = i.length - 1;
					(l = i.length && i[u].merge(c)) ? i[u] = l : i.push(c);
				}
			} else e.map && r--;
		}, this.items.length, 0), new e(W.from(i.reverse()), a);
	}
};
ac.empty = new ac(W.empty, 0);
function oc(e, t) {
	let n;
	return e.forEach((e, r) => {
		if (e.selection && t-- == 0) return n = r, !1;
	}), e.slice(n);
}
var sc = class e {
	constructor(e, t, n, r) {
		this.map = e, this.step = t, this.selection = n, this.mirrorOffset = r;
	}
	merge(t) {
		if (this.step && t.step && !t.selection) {
			let n = t.step.merge(this.step);
			if (n) return new e(n.getMap().invert(), n, this.selection);
		}
	}
}, cc = class {
	constructor(e, t, n, r, i) {
		this.done = e, this.undone = t, this.prevRanges = n, this.prevTime = r, this.prevComposition = i;
	}
}, lc = 20;
function uc(e, t, n, r) {
	let i = n.getMeta(vc), a;
	if (i) return i.historyState;
	n.getMeta(yc) && (e = new cc(e.done, e.undone, null, 0, -1));
	let o = n.getMeta("appendedTransaction");
	if (n.steps.length == 0) return e;
	if (o && o.getMeta(vc)) return o.getMeta(vc).redo ? new cc(e.done.addTransform(n, void 0, r, _c(t)), e.undone, fc(n.mapping.maps), e.prevTime, e.prevComposition) : new cc(e.done, e.undone.addTransform(n, void 0, r, _c(t)), null, e.prevTime, e.prevComposition);
	if (n.getMeta("addToHistory") !== !1 && !(o && o.getMeta("addToHistory") === !1)) {
		let i = n.getMeta("composition"), a = e.prevTime == 0 || !o && e.prevComposition != i && (e.prevTime < (n.time || 0) - r.newGroupDelay || !dc(n, e.prevRanges)), s = o ? pc(e.prevRanges, n.mapping) : fc(n.mapping.maps);
		return new cc(e.done.addTransform(n, a ? t.selection.getBookmark() : void 0, r, _c(t)), ac.empty, s, n.time, i ?? e.prevComposition);
	}
	return (a = n.getMeta("rebased")) ? new cc(e.done.rebased(n, a), e.undone.rebased(n, a), pc(e.prevRanges, n.mapping), e.prevTime, e.prevComposition) : new cc(e.done.addMaps(n.mapping.maps), e.undone.addMaps(n.mapping.maps), pc(e.prevRanges, n.mapping), e.prevTime, e.prevComposition);
}
function dc(e, t) {
	if (!t) return !1;
	if (!e.docChanged) return !0;
	let n = !1;
	return e.mapping.maps[0].forEach((e, r) => {
		for (let i = 0; i < t.length; i += 2) e <= t[i + 1] && r >= t[i] && (n = !0);
	}), n;
}
function fc(e) {
	let t = [];
	for (let n = e.length - 1; n >= 0 && t.length == 0; n--) e[n].forEach((e, n, r, i) => t.push(r, i));
	return t;
}
function pc(e, t) {
	if (!e) return null;
	let n = [];
	for (let r = 0; r < e.length; r += 2) {
		let i = t.map(e[r], 1), a = t.map(e[r + 1], -1);
		i <= a && n.push(i, a);
	}
	return n;
}
function mc(e, t, n) {
	let r = _c(t), i = vc.get(t).spec.config, a = (n ? e.undone : e.done).popEvent(t, r);
	if (!a) return null;
	let o = a.selection.resolve(a.transform.doc), s = (n ? e.done : e.undone).addTransform(a.transform, t.selection.getBookmark(), i, r), c = new cc(n ? s : a.remaining, n ? a.remaining : s, null, 0, -1);
	return a.transform.setSelection(o).setMeta(vc, {
		redo: n,
		historyState: c
	});
}
var hc = !1, gc = null;
function _c(e) {
	let t = e.plugins;
	if (gc != t) {
		hc = !1, gc = t;
		for (let e = 0; e < t.length; e++) if (t[e].spec.historyPreserveItems) {
			hc = !0;
			break;
		}
	}
	return hc;
}
var vc = new Rn("history"), yc = new Rn("closeHistory");
function bc(e = {}) {
	return e = {
		depth: e.depth || 100,
		newGroupDelay: e.newGroupDelay || 500
	}, new Fn({
		key: vc,
		state: {
			init() {
				return new cc(ac.empty, ac.empty, null, 0, -1);
			},
			apply(t, n, r) {
				return uc(n, r, t, e);
			}
		},
		config: e,
		props: { handleDOMEvents: { beforeinput(e, t) {
			let n = t.inputType, r = n == "historyUndo" ? Sc : n == "historyRedo" ? Cc : null;
			return !r || !e.editable ? !1 : (t.preventDefault(), r(e.state, e.dispatch));
		} } }
	});
}
function xc(e, t) {
	return (n, r) => {
		let i = vc.getState(n);
		if (!i || (e ? i.undone : i.done).eventCount == 0) return !1;
		if (r) {
			let a = mc(i, n, e);
			a && r(t ? a.scrollIntoView() : a);
		}
		return !0;
	};
}
var Sc = xc(!1, !0), Cc = xc(!0, !0), wc, Tc;
if (typeof WeakMap < "u") {
	let e = /* @__PURE__ */ new WeakMap();
	wc = (t) => e.get(t), Tc = (t, n) => (e.set(t, n), n);
} else {
	let e = [], t = 0;
	wc = (t) => {
		for (let n = 0; n < e.length; n += 2) if (e[n] == t) return e[n + 1];
	}, Tc = (n, r) => (t == 10 && (t = 0), e[t++] = n, e[t++] = r);
}
var G = class {
	constructor(e, t, n, r) {
		this.width = e, this.height = t, this.map = n, this.problems = r;
	}
	findCell(e) {
		for (let t = 0; t < this.map.length; t++) {
			let n = this.map[t];
			if (n != e) continue;
			let r = t % this.width, i = t / this.width | 0, a = r + 1, o = i + 1;
			for (let e = 1; a < this.width && this.map[t + e] == n; e++) a++;
			for (let e = 1; o < this.height && this.map[t + this.width * e] == n; e++) o++;
			return {
				left: r,
				top: i,
				right: a,
				bottom: o
			};
		}
		throw RangeError(`No cell with offset ${e} found`);
	}
	colCount(e) {
		for (let t = 0; t < this.map.length; t++) if (this.map[t] == e) return t % this.width;
		throw RangeError(`No cell with offset ${e} found`);
	}
	nextCell(e, t, n) {
		let { left: r, right: i, top: a, bottom: o } = this.findCell(e);
		return t == "horiz" ? (n < 0 ? r == 0 : i == this.width) ? null : this.map[a * this.width + (n < 0 ? r - 1 : i)] : (n < 0 ? a == 0 : o == this.height) ? null : this.map[r + this.width * (n < 0 ? a - 1 : o)];
	}
	rectBetween(e, t) {
		let { left: n, right: r, top: i, bottom: a } = this.findCell(e), { left: o, right: s, top: c, bottom: l } = this.findCell(t);
		return {
			left: Math.min(n, o),
			top: Math.min(i, c),
			right: Math.max(r, s),
			bottom: Math.max(a, l)
		};
	}
	cellsInRect(e) {
		let t = [], n = {};
		for (let r = e.top; r < e.bottom; r++) for (let i = e.left; i < e.right; i++) {
			let a = r * this.width + i, o = this.map[a];
			n[o] || (n[o] = !0, !(i == e.left && i && this.map[a - 1] == o || r == e.top && r && this.map[a - this.width] == o) && t.push(o));
		}
		return t;
	}
	positionAt(e, t, n) {
		for (let r = 0, i = 0;; r++) {
			let a = i + n.child(r).nodeSize;
			if (r == e) {
				let n = t + e * this.width, r = (e + 1) * this.width;
				for (; n < r && this.map[n] < i;) n++;
				return n == r ? a - 1 : this.map[n];
			}
			i = a;
		}
	}
	static get(e) {
		return wc(e) || Tc(e, Ec(e));
	}
};
function Ec(e) {
	if (e.type.spec.tableRole != "table") throw RangeError("Not a table node: " + e.type.name);
	let t = Dc(e), n = e.childCount, r = [], i = 0, a = null, o = [];
	for (let e = 0, i = t * n; e < i; e++) r[e] = 0;
	for (let s = 0, c = 0; s < n; s++) {
		let l = e.child(s);
		c++;
		for (let e = 0;; e++) {
			for (; i < r.length && r[i] != 0;) i++;
			if (e == l.childCount) break;
			let u = l.child(e), { colspan: d, rowspan: f, colwidth: p } = u.attrs;
			for (let e = 0; e < f; e++) {
				if (e + s >= n) {
					(a || (a = [])).push({
						type: "overlong_rowspan",
						pos: c,
						n: f - e
					});
					break;
				}
				let l = i + e * t;
				for (let e = 0; e < d; e++) {
					r[l + e] == 0 ? r[l + e] = c : (a || (a = [])).push({
						type: "collision",
						row: s,
						pos: c,
						n: d - e
					});
					let n = p && p[e];
					if (n) {
						let r = (l + e) % t * 2, i = o[r];
						i == null || i != n && o[r + 1] == 1 ? (o[r] = n, o[r + 1] = 1) : i == n && o[r + 1]++;
					}
				}
			}
			i += d, c += u.nodeSize;
		}
		let u = (s + 1) * t, d = 0;
		for (; i < u;) r[i++] == 0 && d++;
		d && (a || (a = [])).push({
			type: "missing",
			row: s,
			n: d
		}), c++;
	}
	(t === 0 || n === 0) && (a || (a = [])).push({ type: "zero_sized" });
	let s = new G(t, n, r, a), c = !1;
	for (let e = 0; !c && e < o.length; e += 2) o[e] != null && o[e + 1] < n && (c = !0);
	return c && Oc(s, o, e), s;
}
function Dc(e) {
	let t = -1, n = !1;
	for (let r = 0; r < e.childCount; r++) {
		let i = e.child(r), a = 0;
		if (n) for (let t = 0; t < r; t++) {
			let n = e.child(t);
			for (let e = 0; e < n.childCount; e++) {
				let i = n.child(e);
				t + i.attrs.rowspan > r && (a += i.attrs.colspan);
			}
		}
		for (let e = 0; e < i.childCount; e++) {
			let t = i.child(e);
			a += t.attrs.colspan, t.attrs.rowspan > 1 && (n = !0);
		}
		t == -1 ? t = a : t != a && (t = Math.max(t, a));
	}
	return t;
}
function Oc(e, t, n) {
	e.problems || (e.problems = []);
	let r = {};
	for (let i = 0; i < e.map.length; i++) {
		let a = e.map[i];
		if (r[a]) continue;
		r[a] = !0;
		let o = n.nodeAt(a);
		if (!o) throw RangeError(`No cell with offset ${a} found`);
		let s = null, c = o.attrs;
		for (let n = 0; n < c.colspan; n++) {
			let r = t[(i + n) % e.width * 2];
			r != null && (!c.colwidth || c.colwidth[n] != r) && ((s || (s = kc(c)))[n] = r);
		}
		s && e.problems.unshift({
			type: "colwidth mismatch",
			pos: a,
			colwidth: s
		});
	}
}
function kc(e) {
	if (e.colwidth) return e.colwidth.slice();
	let t = [];
	for (let n = 0; n < e.colspan; n++) t.push(0);
	return t;
}
function Ac(e, t) {
	if (typeof e == "string") return {};
	let n = e.getAttribute("data-colwidth"), r = n && /^\d+(,\d+)*$/.test(n) ? n.split(",").map((e) => Number(e)) : null, i = Number(e.getAttribute("colspan") || 1), a = {
		colspan: i,
		rowspan: Number(e.getAttribute("rowspan") || 1),
		colwidth: r && r.length == i ? r : null
	};
	for (let n in t) {
		let r = t[n].getFromDOM, i = r && r(e);
		i != null && (a[n] = i);
	}
	return a;
}
function jc(e, t) {
	let n = {};
	e.attrs.colspan != 1 && (n.colspan = e.attrs.colspan), e.attrs.rowspan != 1 && (n.rowspan = e.attrs.rowspan), e.attrs.colwidth && (n["data-colwidth"] = e.attrs.colwidth.join(","));
	for (let r in t) {
		let i = t[r].setDOMAttr;
		i && i(e.attrs[r], n);
	}
	return n;
}
function Mc(e) {
	if (e !== null) {
		if (!Array.isArray(e)) throw TypeError("colwidth must be null or an array");
		for (let t of e) if (typeof t != "number") throw TypeError("colwidth must be null or an array of numbers");
	}
}
function Nc(e) {
	let t = e.cellAttributes || {}, n = {
		colspan: {
			default: 1,
			validate: "number"
		},
		rowspan: {
			default: 1,
			validate: "number"
		},
		colwidth: {
			default: null,
			validate: Mc
		}
	};
	for (let e in t) n[e] = {
		default: t[e].default,
		validate: t[e].validate
	};
	return {
		table: {
			content: "table_row+",
			tableRole: "table",
			isolating: !0,
			group: e.tableGroup,
			parseDOM: [{ tag: "table" }],
			toDOM() {
				return ["table", ["tbody", 0]];
			}
		},
		table_row: {
			content: "(table_cell | table_header)*",
			tableRole: "row",
			parseDOM: [{ tag: "tr" }],
			toDOM() {
				return ["tr", 0];
			}
		},
		table_cell: {
			content: e.cellContent,
			attrs: n,
			tableRole: "cell",
			isolating: !0,
			parseDOM: [{
				tag: "td",
				getAttrs: (e) => Ac(e, t)
			}],
			toDOM(e) {
				return [
					"td",
					jc(e, t),
					0
				];
			}
		},
		table_header: {
			content: e.cellContent,
			attrs: n,
			tableRole: "header_cell",
			isolating: !0,
			parseDOM: [{
				tag: "th",
				getAttrs: (e) => Ac(e, t)
			}],
			toDOM(e) {
				return [
					"th",
					jc(e, t),
					0
				];
			}
		}
	};
}
function K(e) {
	let t = e.cached.tableNodeTypes;
	if (!t) {
		t = e.cached.tableNodeTypes = {};
		for (let n in e.nodes) {
			let r = e.nodes[n], i = r.spec.tableRole;
			i && (t[i] = r);
		}
	}
	return t;
}
var Pc = new Rn("selectingCells");
function Fc(e) {
	for (let t = e.depth - 1; t > 0; t--) if (e.node(t).type.spec.tableRole == "row") return e.node(0).resolve(e.before(t + 1));
	return null;
}
function Ic(e) {
	for (let t = e.depth; t > 0; t--) {
		let n = e.node(t).type.spec.tableRole;
		if (n === "cell" || n === "header_cell") return e.node(t);
	}
	return null;
}
function Lc(e) {
	let t = e.selection.$head;
	for (let e = t.depth; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return !0;
	return !1;
}
function Rc(e) {
	let t = e.selection;
	if ("$anchorCell" in t && t.$anchorCell) return t.$anchorCell.pos > t.$headCell.pos ? t.$anchorCell : t.$headCell;
	if ("node" in t && t.node && t.node.type.spec.tableRole == "cell") return t.$anchor;
	let n = Fc(t.$head) || zc(t.$head);
	if (n) return n;
	throw RangeError(`No cell found around position ${t.head}`);
}
function zc(e) {
	for (let t = e.nodeAfter, n = e.pos; t; t = t.firstChild, n++) {
		let r = t.type.spec.tableRole;
		if (r == "cell" || r == "header_cell") return e.doc.resolve(n);
	}
	for (let t = e.nodeBefore, n = e.pos; t; t = t.lastChild, n--) {
		let r = t.type.spec.tableRole;
		if (r == "cell" || r == "header_cell") return e.doc.resolve(n - t.nodeSize);
	}
}
function Bc(e) {
	return e.parent.type.spec.tableRole == "row" && !!e.nodeAfter;
}
function Vc(e, t) {
	return e.depth == t.depth && e.pos >= t.start(-1) && e.pos <= t.end(-1);
}
function Hc(e, t, n) {
	let r = e.node(-1), i = G.get(r), a = e.start(-1), o = i.nextCell(e.pos - a, t, n);
	return o == null ? null : e.node(0).resolve(a + o);
}
function Uc(e, t, n = 1) {
	let r = {
		...e,
		colspan: e.colspan - n
	};
	return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(t, n), r.colwidth.some((e) => e > 0) || (r.colwidth = null)), r;
}
function Wc(e, t, n = 1) {
	let r = {
		...e,
		colspan: e.colspan + n
	};
	if (r.colwidth) {
		r.colwidth = r.colwidth.slice();
		for (let e = 0; e < n; e++) r.colwidth.splice(t, 0, 0);
	}
	return r;
}
function Gc(e, t, n) {
	let r = K(t.type.schema).header_cell;
	for (let i = 0; i < e.height; i++) if (t.nodeAt(e.map[n + i * e.width]).type != r) return !1;
	return !0;
}
var q = class e extends w {
	constructor(e, t = e) {
		let n = e.node(-1), r = G.get(n), i = e.start(-1), a = r.rectBetween(e.pos - i, t.pos - i), o = e.node(0), s = r.cellsInRect(a).filter((e) => e != t.pos - i);
		s.unshift(t.pos - i);
		let c = s.map((e) => {
			let t = n.nodeAt(e);
			if (!t) throw RangeError(`No cell with offset ${e} found`);
			let r = i + e + 1;
			return new gn(o.resolve(r), o.resolve(r + t.content.size));
		});
		super(c[0].$from, c[0].$to, c), this.$anchorCell = e, this.$headCell = t;
	}
	map(t, n) {
		let r = t.resolve(n.map(this.$anchorCell.pos)), i = t.resolve(n.map(this.$headCell.pos));
		if (Bc(r) && Bc(i) && Vc(r, i)) {
			let t = this.$anchorCell.node(-1) != r.node(-1);
			return t && this.isRowSelection() ? e.rowSelection(r, i) : t && this.isColSelection() ? e.colSelection(r, i) : new e(r, i);
		}
		return T.between(r, i);
	}
	content() {
		let e = this.$anchorCell.node(-1), t = G.get(e), n = this.$anchorCell.start(-1), r = t.rectBetween(this.$anchorCell.pos - n, this.$headCell.pos - n), i = {}, o = [];
		for (let n = r.top; n < r.bottom; n++) {
			let s = [];
			for (let a = n * t.width + r.left, o = r.left; o < r.right; o++, a++) {
				let n = t.map[a];
				if (i[n]) continue;
				i[n] = !0;
				let o = t.findCell(n), c = e.nodeAt(n);
				if (!c) throw RangeError(`No cell with offset ${n} found`);
				let l = r.left - o.left, u = o.right - r.right;
				if (l > 0 || u > 0) {
					let e = c.attrs;
					if (l > 0 && (e = Uc(e, 0, l)), u > 0 && (e = Uc(e, e.colspan - u, u)), o.left < r.left) {
						if (c = c.type.createAndFill(e), !c) throw RangeError(`Could not create cell with attrs ${JSON.stringify(e)}`);
					} else c = c.type.create(e, c.content);
				}
				if (o.top < r.top || o.bottom > r.bottom) {
					let e = {
						...c.attrs,
						rowspan: Math.min(o.bottom, r.bottom) - Math.max(o.top, r.top)
					};
					c = o.top < r.top ? c.type.createAndFill(e) : c.type.create(e, c.content);
				}
				s.push(c);
			}
			o.push(e.child(n).copy(a.from(s)));
		}
		let s = this.isColSelection() && this.isRowSelection() ? e : o;
		return new d(a.from(s), 1, 1);
	}
	replace(e, t = d.empty) {
		let n = e.steps.length, r = this.ranges;
		for (let i = 0; i < r.length; i++) {
			let { $from: a, $to: o } = r[i], s = e.mapping.slice(n);
			e.replace(s.map(a.pos), s.map(o.pos), i ? d.empty : t);
		}
		let i = w.findFrom(e.doc.resolve(e.mapping.slice(n).map(this.to)), -1);
		i && e.setSelection(i);
	}
	replaceWith(e, t) {
		this.replace(e, new d(a.from(t), 0, 0));
	}
	forEachCell(e) {
		let t = this.$anchorCell.node(-1), n = G.get(t), r = this.$anchorCell.start(-1), i = n.cellsInRect(n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r));
		for (let n = 0; n < i.length; n++) e(t.nodeAt(i[n]), r + i[n]);
	}
	isColSelection() {
		let e = this.$anchorCell.index(-1), t = this.$headCell.index(-1);
		if (Math.min(e, t) > 0) return !1;
		let n = e + this.$anchorCell.nodeAfter.attrs.rowspan, r = t + this.$headCell.nodeAfter.attrs.rowspan;
		return Math.max(n, r) == this.$headCell.node(-1).childCount;
	}
	static colSelection(t, n = t) {
		let r = t.node(-1), i = G.get(r), a = t.start(-1), o = i.findCell(t.pos - a), s = i.findCell(n.pos - a), c = t.node(0);
		return o.top <= s.top ? (o.top > 0 && (t = c.resolve(a + i.map[o.left])), s.bottom < i.height && (n = c.resolve(a + i.map[i.width * (i.height - 1) + s.right - 1]))) : (s.top > 0 && (n = c.resolve(a + i.map[s.left])), o.bottom < i.height && (t = c.resolve(a + i.map[i.width * (i.height - 1) + o.right - 1]))), new e(t, n);
	}
	isRowSelection() {
		let e = this.$anchorCell.node(-1), t = G.get(e), n = this.$anchorCell.start(-1), r = t.colCount(this.$anchorCell.pos - n), i = t.colCount(this.$headCell.pos - n);
		if (Math.min(r, i) > 0) return !1;
		let a = r + this.$anchorCell.nodeAfter.attrs.colspan, o = i + this.$headCell.nodeAfter.attrs.colspan;
		return Math.max(a, o) == t.width;
	}
	eq(t) {
		return t instanceof e && t.$anchorCell.pos == this.$anchorCell.pos && t.$headCell.pos == this.$headCell.pos;
	}
	static rowSelection(t, n = t) {
		let r = t.node(-1), i = G.get(r), a = t.start(-1), o = i.findCell(t.pos - a), s = i.findCell(n.pos - a), c = t.node(0);
		return o.left <= s.left ? (o.left > 0 && (t = c.resolve(a + i.map[o.top * i.width])), s.right < i.width && (n = c.resolve(a + i.map[i.width * (s.top + 1) - 1]))) : (s.left > 0 && (n = c.resolve(a + i.map[s.top * i.width])), o.right < i.width && (t = c.resolve(a + i.map[i.width * (o.top + 1) - 1]))), new e(t, n);
	}
	toJSON() {
		return {
			type: "cell",
			anchor: this.$anchorCell.pos,
			head: this.$headCell.pos
		};
	}
	static fromJSON(t, n) {
		return new e(t.resolve(n.anchor), t.resolve(n.head));
	}
	static create(t, n, r = n) {
		return new e(t.resolve(n), t.resolve(r));
	}
	getBookmark() {
		return new Kc(this.$anchorCell.pos, this.$headCell.pos);
	}
};
q.prototype.visible = !1, w.jsonID("cell", q);
var Kc = class e {
	constructor(e, t) {
		this.anchor = e, this.head = t;
	}
	map(t) {
		return new e(t.map(this.anchor), t.map(this.head));
	}
	resolve(e) {
		let t = e.resolve(this.anchor), n = e.resolve(this.head);
		return t.parent.type.spec.tableRole == "row" && n.parent.type.spec.tableRole == "row" && t.index() < t.parent.childCount && n.index() < n.parent.childCount && Vc(t, n) ? new q(t, n) : w.near(n, 1);
	}
};
function qc(e) {
	if (!(e.selection instanceof q)) return null;
	let t = [];
	return e.selection.forEachCell((e, n) => {
		t.push(B.node(n, n + e.nodeSize, { class: "selectedCell" }));
	}), V.create(e.doc, t);
}
function Jc({ $from: e, $to: t }) {
	if (e.pos == t.pos || e.pos < t.pos - 6) return !1;
	let n = e.pos, r = t.pos, i = e.depth;
	for (; i >= 0 && !(e.after(i + 1) < e.end(i)); i--, n++);
	for (let e = t.depth; e >= 0 && !(t.before(e + 1) > t.start(e)); e--, r--);
	return n == r && /row|table/.test(e.node(i).type.spec.tableRole);
}
function Yc({ $from: e, $to: t }) {
	let n, r;
	for (let t = e.depth; t > 0; t--) {
		let r = e.node(t);
		if (r.type.spec.tableRole === "cell" || r.type.spec.tableRole === "header_cell") {
			n = r;
			break;
		}
	}
	for (let e = t.depth; e > 0; e--) {
		let n = t.node(e);
		if (n.type.spec.tableRole === "cell" || n.type.spec.tableRole === "header_cell") {
			r = n;
			break;
		}
	}
	return n !== r && t.parentOffset === 0;
}
function Xc(e, t, n) {
	let r = (t || e).selection, i = (t || e).doc, a, o;
	if (r instanceof E && (o = r.node.type.spec.tableRole)) {
		if (o == "cell" || o == "header_cell") a = q.create(i, r.from);
		else if (o == "row") {
			let e = i.resolve(r.from + 1);
			a = q.rowSelection(e, e);
		} else if (!n) {
			let e = G.get(r.node), t = r.from + 1, n = t + e.map[e.width * e.height - 1];
			a = q.create(i, t + 1, n);
		}
	} else r instanceof T && Jc(r) ? a = T.create(i, r.from) : r instanceof T && Yc(r) && (a = T.create(i, r.$from.start(), r.$from.end()));
	return a && (t || (t = e.tr)).setSelection(a), t;
}
var Zc = new Rn("fix-tables");
function Qc(e, t, n, r) {
	let i = e.childCount, a = t.childCount;
	outer: for (let o = 0, s = 0; o < a; o++) {
		let a = t.child(o);
		for (let t = s, r = Math.min(i, o + 3); t < r; t++) if (e.child(t) == a) {
			s = t + 1, n += a.nodeSize;
			continue outer;
		}
		r(a, n), s < i && e.child(s).sameMarkup(a) ? Qc(e.child(s), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
	}
}
function $c(e, t) {
	let n, r = (t, r) => {
		t.type.spec.tableRole == "table" && (n = el(e, t, r, n));
	};
	return t ? t.doc != e.doc && Qc(t.doc, e.doc, 0, r) : e.doc.descendants(r), n;
}
function el(e, t, n, r) {
	let i = G.get(t);
	if (!i.problems) return r;
	r || (r = e.tr);
	let a = [];
	for (let e = 0; e < i.height; e++) a.push(0);
	for (let e = 0; e < i.problems.length; e++) {
		let o = i.problems[e];
		if (o.type == "collision") {
			let e = t.nodeAt(o.pos);
			if (!e) continue;
			let i = e.attrs;
			for (let e = 0; e < i.rowspan; e++) a[o.row + e] += o.n;
			r.setNodeMarkup(r.mapping.map(n + 1 + o.pos), null, Uc(i, i.colspan - o.n, o.n));
		} else if (o.type == "missing") a[o.row] += o.n;
		else if (o.type == "overlong_rowspan") {
			let e = t.nodeAt(o.pos);
			if (!e) continue;
			r.setNodeMarkup(r.mapping.map(n + 1 + o.pos), null, {
				...e.attrs,
				rowspan: e.attrs.rowspan - o.n
			});
		} else if (o.type == "colwidth mismatch") {
			let e = t.nodeAt(o.pos);
			if (!e) continue;
			r.setNodeMarkup(r.mapping.map(n + 1 + o.pos), null, {
				...e.attrs,
				colwidth: o.colwidth
			});
		} else if (o.type == "zero_sized") {
			let e = r.mapping.map(n);
			r.delete(e, e + t.nodeSize);
		}
	}
	let o, s;
	for (let e = 0; e < a.length; e++) a[e] && (o ?? (o = e), s = e);
	for (let c = 0, l = n + 1; c < i.height; c++) {
		let n = t.child(c), i = l + n.nodeSize, u = a[c];
		if (u > 0) {
			let t = "cell";
			n.firstChild && (t = n.firstChild.type.spec.tableRole);
			let a = [];
			for (let n = 0; n < u; n++) {
				let n = K(e.schema)[t].createAndFill();
				n && a.push(n);
			}
			let d = (c == 0 || o == c - 1) && s == c ? l + 1 : i - 1;
			r.insert(r.mapping.map(d), a);
		}
		l = i;
	}
	return r.setMeta(Zc, { fixTables: !0 });
}
function tl(e) {
	let t = e.selection, n = Rc(e), r = n.node(-1), i = n.start(-1), a = G.get(r);
	return {
		...t instanceof q ? a.rectBetween(t.$anchorCell.pos - i, t.$headCell.pos - i) : a.findCell(n.pos - i),
		tableStart: i,
		map: a,
		table: r
	};
}
function nl(e, { map: t, tableStart: n, table: r }, i) {
	let a = i > 0 ? -1 : 0;
	Gc(t, r, i + a) && (a = i == 0 || i == t.width ? null : 0);
	for (let o = 0; o < t.height; o++) {
		let s = o * t.width + i;
		if (i > 0 && i < t.width && t.map[s - 1] == t.map[s]) {
			let a = t.map[s], c = r.nodeAt(a);
			e.setNodeMarkup(e.mapping.map(n + a), null, Wc(c.attrs, i - t.colCount(a))), o += c.attrs.rowspan - 1;
		} else {
			let c = a == null ? K(r.type.schema).cell : r.nodeAt(t.map[s + a]).type, l = t.positionAt(o, i, r);
			e.insert(e.mapping.map(n + l), c.createAndFill());
		}
	}
	return e;
}
function rl(e, t) {
	if (!Lc(e)) return !1;
	if (t) {
		let n = tl(e);
		t(nl(e.tr, n, n.left));
	}
	return !0;
}
function il(e, t) {
	if (!Lc(e)) return !1;
	if (t) {
		let n = tl(e);
		t(nl(e.tr, n, n.right));
	}
	return !0;
}
function al(e, { map: t, table: n, tableStart: r }, i) {
	let a = e.mapping.maps.length;
	for (let o = 0; o < t.height;) {
		let s = o * t.width + i, c = t.map[s], l = n.nodeAt(c), u = l.attrs;
		if (i > 0 && t.map[s - 1] == c || i < t.width - 1 && t.map[s + 1] == c) e.setNodeMarkup(e.mapping.slice(a).map(r + c), null, Uc(u, i - t.colCount(c)));
		else {
			let t = e.mapping.slice(a).map(r + c);
			e.delete(t, t + l.nodeSize);
		}
		o += u.rowspan;
	}
}
function ol(e, t) {
	if (!Lc(e)) return !1;
	if (t) {
		let n = tl(e), r = e.tr;
		if (n.left == 0 && n.right == n.map.width) return !1;
		for (let e = n.right - 1; al(r, n, e), e != n.left; e--) {
			let e = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
			if (!e) throw RangeError("No table found");
			n.table = e, n.map = G.get(e);
		}
		t(r);
	}
	return !0;
}
function sl(e, t, n) {
	let r = K(t.type.schema).header_cell;
	for (let i = 0; i < e.width; i++) if (t.nodeAt(e.map[i + n * e.width])?.type != r) return !1;
	return !0;
}
function cl(e, { map: t, tableStart: n, table: r }, i) {
	let a = n;
	for (let e = 0; e < i; e++) a += r.child(e).nodeSize;
	let o = [], s = i > 0 ? -1 : 0;
	sl(t, r, i + s) && (s = i == 0 || i == t.height ? null : 0);
	for (let a = 0, c = t.width * i; a < t.width; a++, c++) if (i > 0 && i < t.height && t.map[c] == t.map[c - t.width]) {
		let i = t.map[c], o = r.nodeAt(i).attrs;
		e.setNodeMarkup(n + i, null, {
			...o,
			rowspan: o.rowspan + 1
		}), a += o.colspan - 1;
	} else {
		let e = (s == null ? K(r.type.schema).cell : r.nodeAt(t.map[c + s * t.width])?.type)?.createAndFill();
		e && o.push(e);
	}
	return e.insert(a, K(r.type.schema).row.create(null, o)), e;
}
function ll(e, t) {
	if (!Lc(e)) return !1;
	if (t) {
		let n = tl(e);
		t(cl(e.tr, n, n.top));
	}
	return !0;
}
function ul(e, t) {
	if (!Lc(e)) return !1;
	if (t) {
		let n = tl(e);
		t(cl(e.tr, n, n.bottom));
	}
	return !0;
}
function dl(e, { map: t, table: n, tableStart: r }, i) {
	let a = 0;
	for (let e = 0; e < i; e++) a += n.child(e).nodeSize;
	let o = a + n.child(i).nodeSize, s = e.mapping.maps.length;
	e.delete(a + r, o + r);
	let c = /* @__PURE__ */ new Set();
	for (let a = 0, o = i * t.width; a < t.width; a++, o++) {
		let l = t.map[o];
		if (!c.has(l)) {
			if (c.add(l), i > 0 && l == t.map[o - t.width]) {
				let t = n.nodeAt(l).attrs;
				e.setNodeMarkup(e.mapping.slice(s).map(l + r), null, {
					...t,
					rowspan: t.rowspan - 1
				}), a += t.colspan - 1;
			} else if (i < t.height && l == t.map[o + t.width]) {
				let o = n.nodeAt(l), c = o.attrs, u = o.type.create({
					...c,
					rowspan: o.attrs.rowspan - 1
				}, o.content), d = t.positionAt(i + 1, a, n);
				e.insert(e.mapping.slice(s).map(r + d), u), a += c.colspan - 1;
			}
		}
	}
}
function fl(e, t) {
	if (!Lc(e)) return !1;
	if (t) {
		let n = tl(e), r = e.tr;
		if (n.top == 0 && n.bottom == n.map.height) return !1;
		for (let e = n.bottom - 1; dl(r, n, e), e != n.top; e--) {
			let e = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
			if (!e) throw RangeError("No table found");
			n.table = e, n.map = G.get(n.table);
		}
		t(r);
	}
	return !0;
}
function pl(e) {
	let t = e.content;
	return t.childCount == 1 && t.child(0).isTextblock && t.child(0).childCount == 0;
}
function ml({ width: e, height: t, map: n }, r) {
	let i = r.top * e + r.left, a = i, o = (r.bottom - 1) * e + r.left, s = i + (r.right - r.left - 1);
	for (let t = r.top; t < r.bottom; t++) {
		if (r.left > 0 && n[a] == n[a - 1] || r.right < e && n[s] == n[s + 1]) return !0;
		a += e, s += e;
	}
	for (let a = r.left; a < r.right; a++) {
		if (r.top > 0 && n[i] == n[i - e] || r.bottom < t && n[o] == n[o + e]) return !0;
		i++, o++;
	}
	return !1;
}
function hl(e, t) {
	let n = e.selection;
	if (!(n instanceof q) || n.$anchorCell.pos == n.$headCell.pos) return !1;
	let r = tl(e), { map: i } = r;
	if (ml(i, r)) return !1;
	if (t) {
		let n = e.tr, o = {}, s = a.empty, c, l;
		for (let e = r.top; e < r.bottom; e++) for (let t = r.left; t < r.right; t++) {
			let a = i.map[e * i.width + t], u = r.table.nodeAt(a);
			if (!(o[a] || !u)) {
				if (o[a] = !0, c == null) c = a, l = u;
				else {
					pl(u) || (s = s.append(u.content));
					let e = n.mapping.map(a + r.tableStart);
					n.delete(e, e + u.nodeSize);
				}
			}
		}
		if (c == null || l == null) return !0;
		if (n.setNodeMarkup(c + r.tableStart, null, {
			...Wc(l.attrs, l.attrs.colspan, r.right - r.left - l.attrs.colspan),
			rowspan: r.bottom - r.top
		}), s.size > 0) {
			let e = c + 1 + l.content.size, t = pl(l) ? c + 1 : e;
			n.replaceWith(t + r.tableStart, e + r.tableStart, s);
		}
		n.setSelection(new q(n.doc.resolve(c + r.tableStart))), t(n);
	}
	return !0;
}
function gl(e, t) {
	let n = K(e.schema);
	return _l(({ node: e }) => n[e.type.spec.tableRole])(e, t);
}
function _l(e) {
	return (t, n) => {
		let r = t.selection, i, a;
		if (r instanceof q) {
			if (r.$anchorCell.pos != r.$headCell.pos) return !1;
			i = r.$anchorCell.nodeAfter, a = r.$anchorCell.pos;
		} else {
			if (i = Ic(r.$from), !i) return !1;
			a = Fc(r.$from)?.pos;
		}
		if (i == null || a == null || i.attrs.colspan == 1 && i.attrs.rowspan == 1) return !1;
		if (n) {
			let o = i.attrs, s = [], c = o.colwidth;
			o.rowspan > 1 && (o = {
				...o,
				rowspan: 1
			}), o.colspan > 1 && (o = {
				...o,
				colspan: 1
			});
			let l = tl(t), u = t.tr;
			for (let e = 0; e < l.right - l.left; e++) s.push(c ? {
				...o,
				colwidth: c && c[e] ? [c[e]] : null
			} : o);
			let d;
			for (let t = l.top; t < l.bottom; t++) {
				let n = l.map.positionAt(t, l.left, l.table);
				t == l.top && (n += i.nodeSize);
				for (let r = l.left, a = 0; r < l.right; r++, a++) (r != l.left || t != l.top) && u.insert(d = u.mapping.map(n + l.tableStart, 1), e({
					node: i,
					row: t,
					col: r
				}).createAndFill(s[a]));
			}
			u.setNodeMarkup(a, e({
				node: i,
				row: l.top,
				col: l.left
			}), s[0]), r instanceof q && u.setSelection(new q(u.doc.resolve(r.$anchorCell.pos), d ? u.doc.resolve(d) : void 0)), n(u);
		}
		return !0;
	};
}
function vl(e) {
	return function(t, n) {
		if (!Lc(t)) return !1;
		if (n) {
			let r = K(t.schema), i = tl(t), a = t.tr, o = i.map.cellsInRect(e == "column" ? {
				left: i.left,
				top: 0,
				right: i.right,
				bottom: i.map.height
			} : e == "row" ? {
				left: 0,
				top: i.top,
				right: i.map.width,
				bottom: i.bottom
			} : i), s = o.map((e) => i.table.nodeAt(e));
			for (let e = 0; e < o.length; e++) s[e].type == r.header_cell && a.setNodeMarkup(i.tableStart + o[e], r.cell, s[e].attrs);
			if (a.steps.length === 0) for (let e = 0; e < o.length; e++) a.setNodeMarkup(i.tableStart + o[e], r.header_cell, s[e].attrs);
			n(a);
		}
		return !0;
	};
}
function yl(e, t, n) {
	let r = t.map.cellsInRect({
		left: 0,
		top: 0,
		right: e == "row" ? t.map.width : 1,
		bottom: e == "column" ? t.map.height : 1
	});
	for (let e = 0; e < r.length; e++) {
		let i = t.table.nodeAt(r[e]);
		if (i && i.type !== n.header_cell) return !1;
	}
	return !0;
}
function bl(e, t) {
	return t = t || { useDeprecatedLogic: !1 }, t.useDeprecatedLogic ? vl(e) : function(t, n) {
		if (!Lc(t)) return !1;
		if (n) {
			let r = K(t.schema), i = tl(t), a = t.tr, o = yl("row", i, r), s = yl("column", i, r), c = (e === "column" ? o : e === "row" && s) ? 1 : 0, l = e == "column" ? {
				left: 0,
				top: c,
				right: 1,
				bottom: i.map.height
			} : e == "row" ? {
				left: c,
				top: 0,
				right: i.map.width,
				bottom: 1
			} : i, u = e == "column" ? s ? r.cell : r.header_cell : e == "row" ? o ? r.cell : r.header_cell : r.cell;
			i.map.cellsInRect(l).forEach((e) => {
				let t = e + i.tableStart, n = a.doc.nodeAt(t);
				n && a.setNodeMarkup(t, u, n.attrs);
			}), n(a);
		}
		return !0;
	};
}
bl("row", { useDeprecatedLogic: !0 }), bl("column", { useDeprecatedLogic: !0 }), bl("cell", { useDeprecatedLogic: !0 });
function xl(e, t) {
	let n = e.selection.$anchor;
	for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table") return t && t(e.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
	return !1;
}
function Sl(e, t) {
	let n = e.selection;
	if (!(n instanceof q)) return !1;
	if (t) {
		let r = e.tr, i = K(e.schema).cell.createAndFill().content;
		n.forEachCell((e, t) => {
			e.content.eq(i) || r.replace(r.mapping.map(t + 1), r.mapping.map(t + e.nodeSize - 1), new d(i, 0, 0));
		}), r.docChanged && t(r);
	}
	return !0;
}
function Cl(e) {
	if (e.size === 0) return null;
	let { content: t, openStart: n, openEnd: r } = e;
	for (; t.childCount == 1 && (n > 0 && r > 0 || t.child(0).type.spec.tableRole == "table");) n--, r--, t = t.child(0).content;
	let i = t.child(0), a = i.type.spec.tableRole, o = i.type.schema, s = [];
	if (a == "row") for (let e = 0; e < t.childCount; e++) {
		let i = t.child(e).content, a = e ? 0 : Math.max(0, n - 1), c = e < t.childCount - 1 ? 0 : Math.max(0, r - 1);
		(a || c) && (i = Tl(K(o).row, new d(i, a, c)).content), s.push(i);
	}
	else if (a == "cell" || a == "header_cell") s.push(n || r ? Tl(K(o).row, new d(t, n, r)).content : t);
	else return null;
	return wl(o, s);
}
function wl(e, t) {
	let n = [];
	for (let e = 0; e < t.length; e++) {
		let r = t[e];
		for (let t = r.childCount - 1; t >= 0; t--) {
			let { rowspan: i, colspan: a } = r.child(t).attrs;
			for (let t = e; t < e + i; t++) n[t] = (n[t] || 0) + a;
		}
	}
	let r = 0;
	for (let e = 0; e < n.length; e++) r = Math.max(r, n[e]);
	for (let i = 0; i < n.length; i++) if (i >= t.length && t.push(a.empty), n[i] < r) {
		let o = K(e).cell.createAndFill(), s = [];
		for (let e = n[i]; e < r; e++) s.push(o);
		t[i] = t[i].append(a.from(s));
	}
	return {
		height: t.length,
		width: r,
		rows: t
	};
}
function Tl(e, t) {
	let n = e.createAndFill();
	return new mn(n).replace(0, n.content.size, t).doc;
}
function El({ width: e, height: t, rows: n }, r, i) {
	if (e != r) {
		let t = [], i = [];
		for (let e = 0; e < n.length; e++) {
			let o = n[e], s = [];
			for (let n = t[e] || 0, i = 0; n < r; i++) {
				let a = o.child(i % o.childCount);
				n + a.attrs.colspan > r && (a = a.type.createChecked(Uc(a.attrs, a.attrs.colspan, n + a.attrs.colspan - r), a.content)), s.push(a), n += a.attrs.colspan;
				for (let n = 1; n < a.attrs.rowspan; n++) t[e + n] = (t[e + n] || 0) + a.attrs.colspan;
			}
			i.push(a.from(s));
		}
		n = i, e = r;
	}
	if (t != i) {
		let e = [];
		for (let r = 0, o = 0; r < i; r++, o++) {
			let s = [], c = n[o % t];
			for (let e = 0; e < c.childCount; e++) {
				let t = c.child(e);
				r + t.attrs.rowspan > i && (t = t.type.create({
					...t.attrs,
					rowspan: Math.max(1, i - t.attrs.rowspan)
				}, t.content)), s.push(t);
			}
			e.push(a.from(s));
		}
		n = e, t = i;
	}
	return {
		width: e,
		height: t,
		rows: n
	};
}
function Dl(e, t, n, r, i, o, s) {
	let c = e.doc.type.schema, l = K(c), u, d;
	if (i > t.width) for (let a = 0, o = 0; a < t.height; a++) {
		let c = n.child(a);
		o += c.nodeSize;
		let f = [], p;
		p = c.lastChild == null || c.lastChild.type == l.cell ? u || (u = l.cell.createAndFill()) : d || (d = l.header_cell.createAndFill());
		for (let e = t.width; e < i; e++) f.push(p);
		e.insert(e.mapping.slice(s).map(o - 1 + r), f);
	}
	if (o > t.height) {
		let c = [];
		for (let e = 0, r = (t.height - 1) * t.width; e < Math.max(t.width, i); e++) {
			let i = e >= t.width ? !1 : n.nodeAt(t.map[r + e]).type == l.header_cell;
			c.push(i ? d || (d = l.header_cell.createAndFill()) : u || (u = l.cell.createAndFill()));
		}
		let f = l.row.create(null, a.from(c)), p = [];
		for (let e = t.height; e < o; e++) p.push(f);
		e.insert(e.mapping.slice(s).map(r + n.nodeSize - 2), p);
	}
	return !!(u || d);
}
function Ol(e, t, n, r, i, a, o, s) {
	if (o == 0 || o == t.height) return !1;
	let c = !1;
	for (let l = i; l < a; l++) {
		let i = o * t.width + l, a = t.map[i];
		if (t.map[i - t.width] == a) {
			c = !0;
			let i = n.nodeAt(a), { top: u, left: d } = t.findCell(a);
			e.setNodeMarkup(e.mapping.slice(s).map(a + r), null, {
				...i.attrs,
				rowspan: o - u
			}), e.insert(e.mapping.slice(s).map(t.positionAt(o, d, n)), i.type.createAndFill({
				...i.attrs,
				rowspan: u + i.attrs.rowspan - o
			})), l += i.attrs.colspan - 1;
		}
	}
	return c;
}
function kl(e, t, n, r, i, a, o, s) {
	if (o == 0 || o == t.width) return !1;
	let c = !1;
	for (let l = i; l < a; l++) {
		let i = l * t.width + o, a = t.map[i];
		if (t.map[i - 1] == a) {
			c = !0;
			let i = n.nodeAt(a), u = t.colCount(a), d = e.mapping.slice(s).map(a + r);
			e.setNodeMarkup(d, null, Uc(i.attrs, o - u, i.attrs.colspan - (o - u))), e.insert(d + i.nodeSize, i.type.createAndFill(Uc(i.attrs, 0, o - u))), l += i.attrs.rowspan - 1;
		}
	}
	return c;
}
function Al(e, t, n, r, i) {
	let a = n ? e.doc.nodeAt(n - 1) : e.doc;
	if (!a) throw Error("No table found");
	let o = G.get(a), { top: s, left: c } = r, l = c + i.width, u = s + i.height, f = e.tr, p = 0;
	function m() {
		if (a = n ? f.doc.nodeAt(n - 1) : f.doc, !a) throw Error("No table found");
		o = G.get(a), p = f.mapping.maps.length;
	}
	Dl(f, o, a, n, l, u, p) && m(), Ol(f, o, a, n, c, l, s, p) && m(), Ol(f, o, a, n, c, l, u, p) && m(), kl(f, o, a, n, s, u, c, p) && m(), kl(f, o, a, n, s, u, l, p) && m();
	for (let e = s; e < u; e++) {
		let t = o.positionAt(e, c, a), r = o.positionAt(e, l, a);
		f.replace(f.mapping.slice(p).map(t + n), f.mapping.slice(p).map(r + n), new d(i.rows[e - s], 0, 0));
	}
	m(), f.setSelection(new q(f.doc.resolve(n + o.positionAt(s, c, a)), f.doc.resolve(n + o.positionAt(u - 1, l - 1, a)))), t(f);
}
var jl = Pr({
	ArrowLeft: Nl("horiz", -1),
	ArrowRight: Nl("horiz", 1),
	ArrowUp: Nl("vert", -1),
	ArrowDown: Nl("vert", 1),
	"Shift-ArrowLeft": Pl("horiz", -1),
	"Shift-ArrowRight": Pl("horiz", 1),
	"Shift-ArrowUp": Pl("vert", -1),
	"Shift-ArrowDown": Pl("vert", 1),
	Backspace: Sl,
	"Mod-Backspace": Sl,
	Delete: Sl,
	"Mod-Delete": Sl
});
function Ml(e, t, n) {
	return !n.eq(e.selection) && (t && t(e.tr.setSelection(n).scrollIntoView()), !0);
}
function Nl(e, t) {
	return (n, r, i) => {
		if (!i) return !1;
		let a = n.selection;
		if (a instanceof q) return Ml(n, r, w.near(a.$headCell, t));
		if (e != "horiz" && !a.empty) return !1;
		let o = Rl(i, e, t);
		if (o == null) return !1;
		if (e == "horiz") return Ml(n, r, w.near(n.doc.resolve(a.head + t), t));
		{
			let i = n.doc.resolve(o), a = Hc(i, e, t), s;
			return s = a ? w.near(a, 1) : t < 0 ? w.near(n.doc.resolve(i.before(-1)), -1) : w.near(n.doc.resolve(i.after(-1)), 1), Ml(n, r, s);
		}
	};
}
function Pl(e, t) {
	return (n, r, i) => {
		if (!i) return !1;
		let a = n.selection, o;
		if (a instanceof q) o = a;
		else {
			let r = Rl(i, e, t);
			if (r == null) return !1;
			o = new q(n.doc.resolve(r));
		}
		let s = Hc(o.$headCell, e, t);
		return s ? Ml(n, r, new q(o.$anchorCell, s)) : !1;
	};
}
function Fl(e, t) {
	let n = e.state.doc, r = Fc(n.resolve(t));
	return r ? (e.dispatch(e.state.tr.setSelection(new q(r))), !0) : !1;
}
function Il(e, t, n) {
	if (!Lc(e.state)) return !1;
	let r = Cl(n), i = e.state.selection;
	if (i instanceof q) {
		r || (r = {
			width: 1,
			height: 1,
			rows: [a.from(Tl(K(e.state.schema).cell, n))]
		});
		let t = i.$anchorCell.node(-1), o = i.$anchorCell.start(-1), s = G.get(t).rectBetween(i.$anchorCell.pos - o, i.$headCell.pos - o);
		return r = El(r, s.right - s.left, s.bottom - s.top), Al(e.state, e.dispatch, o, s, r), !0;
	}
	if (r) {
		let t = Rc(e.state), n = t.start(-1);
		return Al(e.state, e.dispatch, n, G.get(t.node(-1)).findCell(t.pos - n), r), !0;
	}
	return !1;
}
function Ll(e, t) {
	if (t.button != 0 || t.ctrlKey || t.metaKey) return;
	let n = zl(e, t.target), r;
	if (t.shiftKey && e.state.selection instanceof q) i(e.state.selection.$anchorCell, t), t.preventDefault();
	else if (t.shiftKey && n && (r = Fc(e.state.selection.$anchor)) != null && Bl(e, t)?.pos != r.pos) i(r, t), t.preventDefault();
	else if (!n) return;
	function i(t, n) {
		let r = Bl(e, n), i = Pc.getState(e.state) == null;
		if (!r || !Vc(t, r)) {
			if (i) r = t;
			else return;
		}
		let a = new q(t, r);
		if (i || !e.state.selection.eq(a)) {
			let n = e.state.tr.setSelection(a);
			i && n.setMeta(Pc, t.pos), e.dispatch(n);
		}
	}
	function a() {
		e.root.removeEventListener("mouseup", a), e.root.removeEventListener("dragstart", a), e.root.removeEventListener("mousemove", o), Pc.getState(e.state) != null && e.dispatch(e.state.tr.setMeta(Pc, -1));
	}
	function o(r) {
		let o = r, s = Pc.getState(e.state), c;
		if (s != null) c = e.state.doc.resolve(s);
		else if (zl(e, o.target) != n && (c = Bl(e, t), !c)) return a();
		c && i(c, o);
	}
	e.root.addEventListener("mouseup", a), e.root.addEventListener("dragstart", a), e.root.addEventListener("mousemove", o);
}
function Rl(e, t, n) {
	if (!(e.state.selection instanceof T)) return null;
	let { $head: r } = e.state.selection;
	for (let i = r.depth - 1; i >= 0; i--) {
		let a = r.node(i);
		if ((n < 0 ? r.index(i) : r.indexAfter(i)) != (n < 0 ? 0 : a.childCount)) return null;
		if (a.type.spec.tableRole == "cell" || a.type.spec.tableRole == "header_cell") {
			let a = r.before(i), o = t == "vert" ? n > 0 ? "down" : "up" : n > 0 ? "right" : "left";
			return e.endOfTextblock(o) ? a : null;
		}
	}
	return null;
}
function zl(e, t) {
	for (; t && t != e.dom; t = t.parentNode) if (t.nodeName == "TD" || t.nodeName == "TH") return t;
	return null;
}
function Bl(e, t) {
	let n = e.posAtCoords({
		left: t.clientX,
		top: t.clientY
	});
	if (!n) return null;
	let { inside: r, pos: i } = n;
	return r >= 0 && Fc(e.state.doc.resolve(r)) || Fc(e.state.doc.resolve(i));
}
var Vl = class {
	constructor(e, t) {
		this.node = e, this.defaultCellMinWidth = t, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty("--default-cell-min-width", `${t}px`), this.colgroup = this.table.appendChild(document.createElement("colgroup")), Hl(e, this.colgroup, this.table, t), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
	}
	update(e) {
		return e.type == this.node.type && (this.node = e, Hl(e, this.colgroup, this.table, this.defaultCellMinWidth), !0);
	}
	ignoreMutation(e) {
		return e.type == "attributes" && (e.target == this.table || this.colgroup.contains(e.target));
	}
};
function Hl(e, t, n, r, i, a) {
	let o = 0, s = !0, c = t.firstChild, l = e.firstChild;
	if (l) {
		for (let e = 0, n = 0; e < l.childCount; e++) {
			let { colspan: u, colwidth: d } = l.child(e).attrs;
			for (let e = 0; e < u; e++, n++) {
				let l = i == n ? a : d && d[e], u = l ? l + "px" : "";
				if (o += l || r, l || (s = !1), c) c.style.width != u && (c.style.width = u), c = c.nextSibling;
				else {
					let e = document.createElement("col");
					e.style.width = u, t.appendChild(e);
				}
			}
		}
		for (; c;) {
			var u;
			let e = c.nextSibling;
			(u = c.parentNode) == null || u.removeChild(c), c = e;
		}
		s ? (n.style.width = o + "px", n.style.minWidth = "") : (n.style.width = "", n.style.minWidth = o + "px");
	}
}
var J = new Rn("tableColumnResizing");
function Ul({ handleWidth: e = 5, cellMinWidth: t = 25, defaultCellMinWidth: n = 100, View: r = Vl, lastColumnResizable: i = !0 } = {}) {
	let a = new Fn({
		key: J,
		state: {
			init(e, t) {
				var i;
				let o = (i = a.spec) == null || (i = i.props) == null ? void 0 : i.nodeViews, s = K(t.schema).table.name;
				return r && o && (o[s] = (e, t) => new r(e, n, t)), new Wl(-1, !1);
			},
			apply(e, t) {
				return t.apply(e);
			}
		},
		props: {
			attributes: (e) => {
				let t = J.getState(e);
				return t && t.activeHandle > -1 ? { class: "resize-cursor" } : {};
			},
			handleDOMEvents: {
				mousemove: (t, n) => {
					Gl(t, n, e, i);
				},
				mouseleave: (e) => {
					Kl(e);
				},
				mousedown: (e, r) => {
					ql(e, r, t, n);
				}
			},
			decorations: (e) => {
				let t = J.getState(e);
				if (t && t.activeHandle > -1) return nu(e, t.activeHandle);
			},
			nodeViews: {}
		}
	});
	return a;
}
var Wl = class e {
	constructor(e, t) {
		this.activeHandle = e, this.dragging = t;
	}
	apply(t) {
		let n = this, r = t.getMeta(J);
		if (r && r.setHandle != null) return new e(r.setHandle, !1);
		if (r && r.setDragging !== void 0) return new e(n.activeHandle, r.setDragging);
		if (n.activeHandle > -1 && t.docChanged) {
			let r = t.mapping.map(n.activeHandle, -1);
			return Bc(t.doc.resolve(r)) || (r = -1), new e(r, n.dragging);
		}
		return n;
	}
};
function Gl(e, t, n, r) {
	if (!e.editable) return;
	let i = J.getState(e.state);
	if (i && !i.dragging) {
		let a = Yl(t.target), o = -1;
		if (a) {
			let { left: r, right: i } = a.getBoundingClientRect();
			t.clientX - r <= n ? o = Xl(e, t, "left", n) : i - t.clientX <= n && (o = Xl(e, t, "right", n));
		}
		if (o != i.activeHandle) {
			if (!r && o !== -1) {
				let t = e.state.doc.resolve(o), n = t.node(-1), r = G.get(n), i = t.start(-1);
				if (r.colCount(t.pos - i) + t.nodeAfter.attrs.colspan - 1 == r.width - 1) return;
			}
			Ql(e, o);
		}
	}
}
function Kl(e) {
	if (!e.editable) return;
	let t = J.getState(e.state);
	t && t.activeHandle > -1 && !t.dragging && Ql(e, -1);
}
function ql(e, t, n, r) {
	if (!e.editable) return !1;
	let i = e.dom.ownerDocument.defaultView ?? window, a = J.getState(e.state);
	if (!a || a.activeHandle == -1 || a.dragging) return !1;
	let o = e.state.doc.nodeAt(a.activeHandle), s = Jl(e, a.activeHandle, o.attrs);
	e.dispatch(e.state.tr.setMeta(J, { setDragging: {
		startX: t.clientX,
		startWidth: s
	} }));
	function c(t) {
		i.removeEventListener("mouseup", c), i.removeEventListener("mousemove", l);
		let r = J.getState(e.state);
		r?.dragging && ($l(e, r.activeHandle, Zl(r.dragging, t, n)), e.dispatch(e.state.tr.setMeta(J, { setDragging: null })));
	}
	function l(t) {
		if (!t.which) return c(t);
		let i = J.getState(e.state);
		if (i && i.dragging) {
			let a = Zl(i.dragging, t, n);
			eu(e, i.activeHandle, a, r);
		}
	}
	return eu(e, a.activeHandle, s, r), i.addEventListener("mouseup", c), i.addEventListener("mousemove", l), t.preventDefault(), !0;
}
function Jl(e, t, { colspan: n, colwidth: r }) {
	let i = r && r[r.length - 1];
	if (i) return i;
	let a = e.domAtPos(t), o = a.node.childNodes[a.offset].offsetWidth, s = n;
	if (r) for (let e = 0; e < n; e++) r[e] && (o -= r[e], s--);
	return o / s;
}
function Yl(e) {
	for (; e && e.nodeName != "TD" && e.nodeName != "TH";) e = e.classList && e.classList.contains("ProseMirror") ? null : e.parentNode;
	return e;
}
function Xl(e, t, n, r) {
	let i = n == "right" ? -r : r, a = e.posAtCoords({
		left: t.clientX + i,
		top: t.clientY
	});
	if (!a) return -1;
	let { pos: o } = a, s = Fc(e.state.doc.resolve(o));
	if (!s) return -1;
	if (n == "right") return s.pos;
	let c = G.get(s.node(-1)), l = s.start(-1), u = c.map.indexOf(s.pos - l);
	return u % c.width == 0 ? -1 : l + c.map[u - 1];
}
function Zl(e, t, n) {
	let r = t.clientX - e.startX;
	return Math.max(n, e.startWidth + r);
}
function Ql(e, t) {
	e.dispatch(e.state.tr.setMeta(J, { setHandle: t }));
}
function $l(e, t, n) {
	let r = e.state.doc.resolve(t), i = r.node(-1), a = G.get(i), o = r.start(-1), s = a.colCount(r.pos - o) + r.nodeAfter.attrs.colspan - 1, c = e.state.tr;
	for (let e = 0; e < a.height; e++) {
		let t = e * a.width + s;
		if (e && a.map[t] == a.map[t - a.width]) continue;
		let r = a.map[t], l = i.nodeAt(r).attrs, u = l.colspan == 1 ? 0 : s - a.colCount(r);
		if (l.colwidth && l.colwidth[u] == n) continue;
		let d = l.colwidth ? l.colwidth.slice() : tu(l.colspan);
		d[u] = n, c.setNodeMarkup(o + r, null, {
			...l,
			colwidth: d
		});
	}
	c.docChanged && e.dispatch(c);
}
function eu(e, t, n, r) {
	let i = e.state.doc.resolve(t), a = i.node(-1), o = i.start(-1), s = G.get(a).colCount(i.pos - o) + i.nodeAfter.attrs.colspan - 1, c = e.domAtPos(i.start(-1)).node;
	for (; c && c.nodeName != "TABLE";) c = c.parentNode;
	c && Hl(a, c.firstChild, c, r, s, n);
}
function tu(e) {
	return Array(e).fill(0);
}
function nu(e, t) {
	let n = [], r = e.doc.resolve(t), i = r.node(-1);
	if (!i) return V.empty;
	let a = G.get(i), o = r.start(-1), s = a.colCount(r.pos - o) + r.nodeAfter.attrs.colspan - 1;
	for (let t = 0; t < a.height; t++) {
		let r = s + t * a.width;
		if ((s == a.width - 1 || a.map[r] != a.map[r + 1]) && (t == 0 || a.map[r] != a.map[r - a.width])) {
			let t = a.map[r], s = o + t + i.nodeAt(t).nodeSize - 1, c = document.createElement("div");
			c.className = "column-resize-handle", J.getState(e)?.dragging && n.push(B.node(o + t, o + t + i.nodeAt(t).nodeSize, { class: "column-resize-dragging" })), n.push(B.widget(s, c));
		}
	}
	return V.create(e.doc, n);
}
function ru({ allowTableNodeSelection: e = !1 } = {}) {
	return new Fn({
		key: Pc,
		state: {
			init() {
				return null;
			},
			apply(e, t) {
				let n = e.getMeta(Pc);
				if (n != null) return n == -1 ? null : n;
				if (t == null || !e.docChanged) return t;
				let { deleted: r, pos: i } = e.mapping.mapResult(t);
				return r ? null : i;
			}
		},
		props: {
			decorations: qc,
			handleDOMEvents: { mousedown: Ll },
			createSelectionBetween(e) {
				return Pc.getState(e.state) == null ? null : e.state.selection;
			},
			handleTripleClick: Fl,
			handleKeyDown: jl,
			handlePaste: Il
		},
		appendTransaction(t, n, r) {
			return Xc(r, $c(r, n), e);
		}
	});
}
//#endregion
//#region src/rhymix/upload.js
function iu() {
	return window.request_uri || window.location.pathname || "/";
}
function au(e) {
	return String(e || "").replaceAll("&amp;", "&").replaceAll("&#039;", "'");
}
function ou(e, t, n = 0) {
	if (!window.jQuery) return;
	let r = window.jQuery(`#xefu-container-${e}`);
	if (!r.length) return;
	let i = r.data("xefu-instance") || r.data("instance") || r.data();
	typeof i?.loadFilelist == "function" ? (r.data("editorStatus", t), i.loadFilelist(r, !0)) : n < 20 && window.setTimeout(() => ou(e, t, n + 1), 100);
}
function su(e, t, n = () => {}) {
	return new Promise((r, i) => {
		let a = new XMLHttpRequest();
		a.open("POST", iu()), a.responseType = "json", a.withCredentials = !0, a.upload?.addEventListener("progress", (e) => {
			e.lengthComputable && n(e.loaded / e.total);
		}), a.addEventListener("load", () => {
			let t = a.response;
			if (!t && a.responseText) try {
				t = JSON.parse(a.responseText);
			} catch {
				i(/* @__PURE__ */ Error("업로드 응답을 읽을 수 없습니다."));
				return;
			}
			let n = Number(t?.error || 0);
			if (a.status < 200 || a.status >= 300 || n !== 0 || !t?.download_url) {
				i(Error(t?.message || `이미지 업로드에 실패했습니다. (${a.status})`));
				return;
			}
			t.download_url = au(t.download_url), t.source_filename = au(t.source_filename), ou(e.sequence, t), r(t);
		}), a.addEventListener("error", () => i(/* @__PURE__ */ Error("이미지 업로드 중 네트워크 오류가 발생했습니다."))), a.addEventListener("abort", () => i(/* @__PURE__ */ Error("이미지 업로드가 취소되었습니다.")));
		let o = new FormData();
		o.append("act", "procFileUpload"), o.append("editor_sequence", String(e.sequence)), o.append("Filedata", t, t.name), o.append("mid", e.config.mid || ""), o.append("module_srl", String(e.config.moduleSrl || 0)), o.append("upload_target_srl", String(e.config.uploadTargetSrl || 0)), e.config.csrfToken && o.append("_rx_csrf_token", e.config.csrfToken), a.send(o);
	});
}
async function cu(e, t, n = () => {}) {
	let r = [];
	for (let [i, a] of t.entries()) {
		let t = await su(e, a.file || a, (e) => n(i, e));
		r.push({
			...t,
			dimensions: a.dimensions || null
		});
	}
	return r;
}
//#endregion
//#region src/images.js
function lu(e) {
	return Array.from(e || []).filter((e) => String(e.type || "").startsWith("image/"));
}
function uu(e, t = Infinity) {
	let n = Number(e.dimensions?.width || e.width || 0), r = Number(e.dimensions?.height || e.height || 0), i = n > 0 ? Math.min(1, t / n) : 1, a = n > 0 ? Math.max(24, Math.round(n * i)) : null, o = r > 0 ? Math.max(24, Math.round(r * i)) : null;
	return {
		src: e.download_url,
		alt: e.source_filename || "",
		width: a,
		height: o,
		displayWidth: a ? `${a}px` : null,
		displayHeight: o ? `${o}px` : null,
		fileSrl: e.file_srl ? String(e.file_srl) : null,
		editorComponent: "image_link"
	};
}
function du(e, t) {
	let n = e.resolve(Math.min(t, e.content.size));
	for (let e = n.depth; e > 0; e--) if (n.node(e).isTextblock) return n.before(e);
	return null;
}
function fu(e, t, { position: n = null, align: r = null } = {}) {
	if (!t.length) return !1;
	let { state: i } = e.view, o = e.view.dom.clientWidth, s = o > 40 ? o - 40 : 640, c = t.map((e) => i.schema.nodes.image.create(uu(e, s))), l = new d(a.fromArray(c), 0, 0), u = i.tr, f = n === null ? i.selection.from : n, p = du(i.doc, f);
	if (u = n === null ? u.replaceSelection(l) : u.replaceRange(f, f, l), r && p !== null) {
		let e = u.doc.nodeAt(p);
		e?.isTextblock && (u = u.setNodeMarkup(p, null, {
			...e.attrs,
			align: r
		}));
	}
	return e.view.dispatch(u.scrollIntoView()), e.view.focus(), !0;
}
function pu(e, t, n = null) {
	cu(e, t.map((e) => ({ file: e }))).then((t) => fu(e, t, { position: n })).catch((e) => window.alert?.(e.message));
}
function mu(e, t) {
	if (!e.config.allowUpload) return !1;
	let n = lu(t.clipboardData?.files);
	return n.length ? (t.preventDefault(), pu(e, n), !0) : !1;
}
function hu(e, t, n) {
	if (!e.config.allowUpload || n) return !1;
	let r = lu(t.dataTransfer?.files);
	return r.length ? (t.preventDefault(), pu(e, r, e.view.posAtCoords({
		left: t.clientX,
		top: t.clientY
	})?.pos ?? e.view.state.selection.from), !0) : !1;
}
//#endregion
//#region src/nodeviews/MediaNodeView.js
var gu = 24;
function _u(e) {
	let t = Number.parseFloat(String(e || ""));
	return Number.isFinite(t) && t > 0 ? t : 0;
}
var vu = class {
	constructor(e, t, n, r) {
		this.node = e, this.view = t, this.getPos = n, this.media = r, this.dom = document.createElement(e.type.isInline ? "span" : "div"), this.dom.className = "roundeditor__media", this.dom.contentEditable = "false", this.dom.draggable = !0, this.dom.appendChild(r), this.handles = [
			"nw",
			"ne",
			"sw",
			"se"
		].map((e) => {
			let t = document.createElement("span");
			return t.className = `roundeditor__media-handle roundeditor__media-handle--${e}`, t.dataset.resizeDirection = e, t.setAttribute("aria-hidden", "true"), t.addEventListener("pointerdown", (t) => this.startResize(t, e)), this.dom.appendChild(t), t;
		});
	}
	currentSize() {
		return {
			width: _u(this.node.attrs.displayWidth || this.node.attrs.width || this.media.width),
			height: _u(this.node.attrs.displayHeight || this.node.attrs.height || this.media.height)
		};
	}
	maxWidth() {
		let e = this.dom.closest(".ProseMirror");
		if (!e) return 640;
		let t = window.getComputedStyle(e), n = _u(t.paddingLeft) + _u(t.paddingRight), r = e.clientWidth || e.getBoundingClientRect().width;
		return Math.max(gu, r > n ? r - n : 640);
	}
	previewSize(e, t) {
		this.media.style.width = `${Math.round(e)}px`, this.media.style.height = `${Math.round(t)}px`, this.dom.style.width = `${Math.round(e)}px`;
	}
	startResize(e, t) {
		if (e.button !== 0) return;
		e.preventDefault(), e.stopPropagation();
		let n = e.currentTarget;
		n.setPointerCapture?.(e.pointerId);
		let r = this.media.getBoundingClientRect(), i = this.currentSize(), a = r.width || i.width || gu, o = r.height || i.height || gu, s = a / o || 1, c = e.clientX, l = t.endsWith("e") ? 1 : -1, u = a, d = o, f = !1, p = (e) => {
			f || (e.preventDefault(), u = Math.min(this.maxWidth(), Math.max(gu, a + (e.clientX - c) * l)), d = Math.max(gu, u / s), this.previewSize(u, d));
		}, m = () => {
			window.removeEventListener("pointermove", p, !0), window.removeEventListener("pointerup", h, !0), window.removeEventListener("pointercancel", g, !0);
		}, h = (t) => {
			f || (f = !0, m(), n.hasPointerCapture?.(e.pointerId) && n.releasePointerCapture(e.pointerId), t.preventDefault?.(), this.updateSize(u, d));
		}, g = () => {
			f || (f = !0, m(), this.renderSize());
		};
		window.addEventListener("pointermove", p, !0), window.addEventListener("pointerup", h, !0), window.addEventListener("pointercancel", g, !0);
	}
	updateSize(e, t) {
		let n = this.position();
		if (n === null) return;
		let r = Math.round(Math.min(this.maxWidth(), Math.max(gu, e))), i = Math.round(Math.max(gu, t)), a = this.view.state.tr.setNodeMarkup(n, null, {
			...this.node.attrs,
			width: r,
			height: i,
			displayWidth: `${r}px`,
			displayHeight: `${i}px`
		});
		a.setSelection(E.create(a.doc, n)), this.view.dispatch(a);
	}
	position() {
		try {
			let e = this.getPos();
			return Number.isInteger(e) ? e : null;
		} catch {
			return null;
		}
	}
	renderSize() {
		let { width: e, height: t } = this.currentSize();
		this.media.style.width = this.node.attrs.displayWidth || (e ? `${e}px` : ""), this.media.style.height = this.node.attrs.displayHeight || (t ? `${t}px` : ""), this.dom.style.width = this.media.style.width;
	}
	selectNode() {
		this.dom.classList.add("roundeditor__media--selected");
	}
	deselectNode() {
		this.dom.classList.remove("roundeditor__media--selected");
	}
	stopEvent(e) {
		return !!e.target.closest(".roundeditor__media-toolbar, .roundeditor__media-handle");
	}
	ignoreMutation() {
		return !0;
	}
};
//#endregion
//#region src/ui/FloatingToolbar.js
function yu(e, t, n = t) {
	let r = document.createElement("button");
	return r.type = "button", r.dataset.mediaAction = e, r.title = t, r.setAttribute("aria-label", t), r.textContent = n, r;
}
function bu(e, t, n = "text") {
	let r = document.createElement("label");
	r.className = "roundeditor__media-field";
	let i = document.createElement("span");
	i.textContent = e;
	let a = document.createElement("input");
	return a.name = t, a.type = n, r.append(i, a), {
		wrapper: r,
		input: a
	};
}
var xu = class {
	constructor({ labels: e, values: t, onDelete: n, onSize: r, onLink: i, onAlt: a, onAlign: o }) {
		this.labels = e, this.values = t, this.handlers = {
			onDelete: n,
			onSize: r,
			onLink: i,
			onAlt: a,
			onAlign: o
		}, this.element = document.createElement("div"), this.element.className = "roundeditor__media-toolbar", this.element.hidden = !0, this.element.contentEditable = "false", this.row = document.createElement("div"), this.row.className = "roundeditor__media-toolbar-row", this.row.append(yu("delete", e.imageDelete, "×"), yu("size", e.imageSize, "↔"), yu("link", e.imageLink, "🔗"), yu("alt", e.imageAlt, "ALT"), yu("left", e.alignLeft, "≡"), yu("center", e.alignCenter, "≡"), yu("right", e.alignRight, "≡")), this.formHost = document.createElement("div"), this.formHost.className = "roundeditor__media-toolbar-form", this.element.append(this.row, this.formHost), this.element.addEventListener("click", (e) => this.execute(e));
	}
	show() {
		this.element.hidden = !1;
	}
	hide() {
		this.element.hidden = !0, this.formHost.replaceChildren();
	}
	execute(e) {
		let t = e.target.closest("[data-media-action]")?.dataset.mediaAction;
		t && (e.preventDefault(), e.stopPropagation(), t === "delete" ? this.handlers.onDelete() : [
			"left",
			"center",
			"right"
		].includes(t) ? this.handlers.onAlign(t === "left" ? null : t) : this.openForm(t));
	}
	openForm(e) {
		let t = this.values(), n = document.createElement("form");
		if (e === "size") {
			let e = bu(this.labels.imageWidth, "width", "number"), r = bu(this.labels.imageHeight, "height", "number");
			for (let t of [e, r]) t.input.min = "24", t.input.inputMode = "numeric";
			e.input.value = t.width || "", r.input.value = t.height || "", n.append(e.wrapper, r.wrapper), n.addEventListener("submit", (t) => {
				t.preventDefault(), this.handlers.onSize(Number(e.input.value), Number(r.input.value)), this.formHost.replaceChildren();
			});
		} else if (e === "link") {
			let e = bu(this.labels.url, "href", "url");
			e.input.value = t.href || "", e.input.placeholder = "https://", n.appendChild(e.wrapper), n.addEventListener("submit", (t) => {
				t.preventDefault(), this.handlers.onLink(e.input.value.trim()), this.formHost.replaceChildren();
			});
		} else {
			let e = bu(this.labels.imageAlt, "alt");
			e.input.value = t.alt || "", n.appendChild(e.wrapper), n.addEventListener("submit", (t) => {
				t.preventDefault(), this.handlers.onAlt(e.input.value), this.formHost.replaceChildren();
			});
		}
		let r = document.createElement("button");
		r.type = "submit", r.textContent = this.labels.apply, n.appendChild(r), this.formHost.replaceChildren(n), n.querySelector("input")?.focus();
	}
}, Su = {
	imageDelete: "Delete image",
	imageSize: "Image size",
	imageLink: "Image link",
	imageAlt: "Alternative text",
	imageWidth: "Width",
	imageHeight: "Height",
	url: "URL",
	apply: "Apply",
	alignLeft: "Align left",
	alignCenter: "Align center",
	alignRight: "Align right"
};
function Cu(e) {
	let t = String(e || "").trim();
	return /^\s*(?:javascript|vbscript|data):/i.test(t) ? "" : t;
}
var wu = class extends vu {
	constructor(e, t, n, r) {
		let i = document.createElement("img");
		i.draggable = !1, super(e, t, n, i), this.bridge = r, this.dom.classList.add("roundeditor__media--image"), this.toolbar = new xu({
			labels: {
				...Su,
				...r.config.labels || {}
			},
			values: () => this.values(),
			onDelete: () => this.remove(),
			onSize: (e, t) => this.resizeFromForm(e, t),
			onLink: (e) => this.setLink(e),
			onAlt: (e) => this.setAlt(e),
			onAlign: (e) => this.setAlign(e)
		}), this.dom.appendChild(this.toolbar.element), this.surface = null, this.placeToolbarOnScroll = () => {
			this.dom.classList.contains("roundeditor__media--selected") && this.placeToolbar();
		}, this.render();
	}
	render() {
		this.media.src = this.node.attrs.src, this.media.alt = this.node.attrs.alt || "", this.media.dataset.fileSrl = this.node.attrs.fileSrl || "", this.renderSize();
	}
	update(e) {
		return e.type === this.node.type && (this.node = e, this.render(), !0);
	}
	selectNode() {
		super.selectNode(), this.toolbar.show(), this.placeToolbar();
	}
	deselectNode() {
		super.deselectNode(), this.toolbar.hide();
	}
	placeToolbar() {
		let e = this.dom.closest(".roundeditor__surface");
		if (!e || this.toolbar.element.hidden) return;
		e !== this.surface && (this.surface?.removeEventListener("scroll", this.placeToolbarOnScroll), this.surface = e, this.surface.addEventListener("scroll", this.placeToolbarOnScroll, { passive: !0 }));
		let t = e.getBoundingClientRect(), n = this.dom.getBoundingClientRect(), r = this.toolbar.element.getBoundingClientRect().height, i = n.top - t.top;
		this.toolbar.element.classList.toggle("roundeditor__media-toolbar--below", i < r + 12);
	}
	values() {
		let e = this.currentSize(), t = this.node.marks.find((e) => e.type === this.view.state.schema.marks.link);
		return {
			...e,
			alt: this.node.attrs.alt || "",
			href: t?.attrs.href || ""
		};
	}
	resizeFromForm(e, t) {
		let n = this.currentSize(), r = n.width && n.height ? n.width / n.height : 1, i = e || n.width || 320, a = t || n.height || i / r;
		e && n.width && e !== n.width ? a = e / r : t && n.height && t !== n.height && (i = t * r), this.updateSize(i, a);
	}
	updateAttrs(e, t = this.node.marks) {
		let n = this.position();
		if (n === null) return;
		let r = this.view.state.tr.setNodeMarkup(n, null, {
			...this.node.attrs,
			...e
		}, t);
		r.setSelection(E.create(r.doc, n)), this.view.dispatch(r);
	}
	setAlt(e) {
		this.updateAttrs({ alt: e });
	}
	setLink(e) {
		let t = Cu(e), n = this.view.state.schema.marks.link, r = this.node.marks.filter((e) => e.type !== n);
		t && r.push(n.create({
			href: t,
			target: "_blank",
			rel: "noreferrer noopener"
		})), this.updateAttrs({}, r);
	}
	setAlign(e) {
		let t = this.position();
		if (t === null) return;
		let n = this.view.state.doc.resolve(t);
		for (let r = n.depth; r > 0; r--) {
			let i = n.node(r);
			if (!i.isTextblock) continue;
			let a = n.before(r), o = this.view.state.tr.setNodeMarkup(a, null, {
				...i.attrs,
				align: e
			});
			o.setSelection(E.create(o.doc, t)), this.view.dispatch(o);
			return;
		}
	}
	remove() {
		let e = this.position();
		e !== null && (this.view.dispatch(this.view.state.tr.delete(e, e + this.node.nodeSize)), this.view.focus());
	}
	destroy() {
		this.surface?.removeEventListener("scroll", this.placeToolbarOnScroll);
	}
};
function Tu(e) {
	return (t, n, r) => new wu(t, n, r, e);
}
//#endregion
//#region src/nodeviews/RawView.js
var Eu = class {
	constructor(e) {
		this.node = e, this.dom = document.createElement(e.type.isInline ? "span" : "div"), this.dom.className = `roundeditor__raw roundeditor__raw--${e.type.isInline ? "inline" : "block"}`, this.dom.contentEditable = "false", this.dom.dataset.roundeditorRawNode = e.type.name;
		let t = document.createElement("span");
		t.className = "roundeditor__raw-label", t.textContent = e.type.name.startsWith("rhymixComponent") ? "라이믹스 에디터 컴포넌트 · 원본 유지됨" : "이 영역은 현재 편집할 수 없습니다 · 원본 유지됨", this.dom.appendChild(t);
	}
	stopEvent() {
		return !0;
	}
	ignoreMutation() {
		return !0;
	}
};
function Du() {
	return Object.fromEntries([
		"embed",
		"rawBlock",
		"rawInline",
		"rhymixComponentBlock",
		"rhymixComponentInline"
	].map((e) => [e, (e) => new Eu(e)]));
}
//#endregion
//#region src/schema/attributes.js
var Ou = new Set("a abbr acronym address article aside audio b basefont bdo big blockquote br caption center cite\n    code col colgroup dd del details dfn dir div dl dt em embed figcaption figure font footer h1 h2\n    h3 h4 h5 h6 header hr i iframe img ins kbd li main mark menu nav object ol p param pre q s samp\n    section small source span strike strong sub summary sup table tbody td tfoot th thead time tr\n    track tt u ul var video wbr".split(/\s+/)), ku = new Set("h1 h2 h3 h4 h5 h6 div p a span img b i strong em u s sub sup header footer nav main section\n    article aside details summary ul ol li mark wbr figure figcaption caption table thead tbody tr th\n    td ins del iframe video audio source track blockquote code".split(/\s+/)), Au = new Set("address article aside audio blockquote caption center col colgroup dd del details dir div dl dt\n    embed figure footer h1 h2 h3 h4 h5 h6 header hr iframe ins li main menu nav object ol p pre section\n    summary table tbody td tfoot th thead tr ul video".split(/\s+/)), ju = new Set("basefont br col embed hr img param source track wbr".split(" ")), Mu = "__roundeditorAttributeOrder", Nu = [
	"id",
	"title",
	"contenteditable",
	"style",
	"dir",
	"xml:lang",
	"lang"
], Pu = {
	a: [
		"href",
		"rel",
		"rev",
		"name",
		"target",
		"rx_encoded_datas"
	],
	audio: [
		"src",
		"type",
		"preload",
		"controls",
		"muted",
		"autoplay",
		"playsinline",
		"loop",
		"data-file-srl",
		"rx_encoded_datas"
	],
	b: ["rx_encoded_datas"],
	basefont: [
		"color",
		"face",
		"size",
		"id"
	],
	bdo: ["dir"],
	blockquote: ["cite", "rx_encoded_datas"],
	br: [
		"id",
		"title",
		"contenteditable",
		"style",
		"clear"
	],
	caption: ["align", "rx_encoded_datas"],
	code: ["rx_encoded_datas"],
	col: [
		"span",
		"width",
		"align",
		"charoff",
		"valign"
	],
	colgroup: [
		"span",
		"width",
		"align",
		"charoff",
		"valign"
	],
	del: [
		"cite",
		"datetime",
		"rx_encoded_datas"
	],
	details: ["open", "rx_encoded_datas"],
	dir: ["compact"],
	div: [
		"align",
		"editor_component",
		"rx_encoded_properties",
		"rx_encoded_datas"
	],
	dl: ["compact"],
	em: ["rx_encoded_datas"],
	embed: [
		"type",
		"width",
		"height",
		"allowscriptaccess",
		"allownetworking",
		"flashvars",
		"wmode",
		"name",
		"src"
	],
	figcaption: ["rx_encoded_datas"],
	figure: ["rx_encoded_datas"],
	font: [
		"color",
		"face",
		"size"
	],
	h1: ["align", "rx_encoded_datas"],
	h2: ["align", "rx_encoded_datas"],
	h3: ["align", "rx_encoded_datas"],
	h4: ["align", "rx_encoded_datas"],
	h5: ["align", "rx_encoded_datas"],
	h6: ["align", "rx_encoded_datas"],
	hr: [
		"align",
		"noshade",
		"size",
		"width"
	],
	i: ["aria-hidden", "rx_encoded_datas"],
	iframe: [
		"src",
		"width",
		"height",
		"name",
		"scrolling",
		"frameborder",
		"longdesc",
		"marginheight",
		"marginwidth",
		"allow",
		"allowfullscreen",
		"loading",
		"referrerpolicy",
		"sandbox",
		"rx_encoded_datas"
	],
	img: [
		"height",
		"width",
		"longdesc",
		"alt",
		"src",
		"name",
		"align",
		"border",
		"hspace",
		"vspace",
		"srcset",
		"data-file-srl",
		"editor_component",
		"rx_encoded_properties",
		"rx_encoded_datas"
	],
	ins: [
		"cite",
		"datetime",
		"rx_encoded_datas"
	],
	li: [
		"value",
		"type",
		"rx_encoded_datas"
	],
	mark: ["rx_encoded_datas"],
	menu: ["compact"],
	object: [
		"type",
		"width",
		"height",
		"data",
		"codebase"
	],
	ol: [
		"compact",
		"start",
		"type",
		"rx_encoded_datas"
	],
	p: ["align", "rx_encoded_datas"],
	param: [
		"id",
		"value",
		"name"
	],
	pre: ["width"],
	q: ["cite"],
	s: ["rx_encoded_datas"],
	source: [
		"src",
		"media",
		"type",
		"rx_encoded_datas"
	],
	span: ["rx_encoded_datas"],
	strong: ["rx_encoded_datas"],
	sub: ["rx_encoded_datas"],
	sup: ["rx_encoded_datas"],
	table: [
		"border",
		"cellpadding",
		"cellspacing",
		"frame",
		"rules",
		"summary",
		"width",
		"align",
		"bgcolor",
		"rx_encoded_datas"
	],
	tbody: [
		"align",
		"charoff",
		"valign",
		"rx_encoded_datas"
	],
	td: [
		"abbr",
		"colspan",
		"rowspan",
		"scope",
		"align",
		"charoff",
		"valign",
		"bgcolor",
		"height",
		"nowrap",
		"width",
		"rx_encoded_datas"
	],
	tfoot: [
		"align",
		"charoff",
		"valign"
	],
	th: [
		"abbr",
		"colspan",
		"rowspan",
		"scope",
		"align",
		"charoff",
		"valign",
		"bgcolor",
		"height",
		"nowrap",
		"width",
		"rx_encoded_datas"
	],
	thead: [
		"align",
		"charoff",
		"valign",
		"rx_encoded_datas"
	],
	time: ["datetime", "pubdate"],
	tr: [
		"align",
		"charoff",
		"valign",
		"bgcolor",
		"rx_encoded_datas"
	],
	track: [
		"src",
		"srclang",
		"label",
		"kind",
		"default",
		"rx_encoded_datas"
	],
	u: ["rx_encoded_datas"],
	ul: [
		"compact",
		"type",
		"rx_encoded_datas"
	],
	video: [
		"src",
		"type",
		"width",
		"height",
		"poster",
		"preload",
		"controls",
		"muted",
		"autoplay",
		"playsinline",
		"loop",
		"data-file-srl",
		"rx_encoded_datas"
	],
	wbr: [
		"id",
		"title",
		"contenteditable",
		"style",
		"rx_encoded_datas"
	]
}, Fu = new Set("-khtml-opacity -moz-opacity align-content align-items align-self aspect-ratio background\n    background-attachment background-color background-image background-position background-repeat\n    background-size border border-bottom border-bottom-color border-bottom-left-radius\n    border-bottom-right-radius border-bottom-style border-bottom-width border-collapse border-color\n    border-left border-left-color border-left-style border-left-width border-radius border-right\n    border-right-color border-right-style border-right-width border-spacing border-style border-top\n    border-top-color border-top-left-radius border-top-right-radius border-top-style border-top-width\n    border-width box-shadow box-sizing caption-side clear color display empty-cells filter flex flex-basis\n    flex-direction flex-flow flex-grow flex-shrink flex-wrap float font font-family font-size font-style\n    font-variant font-weight hanging-punctuation height justify-content letter-spacing line-height\n    list-style list-style-image list-style-position list-style-type margin margin-bottom margin-left\n    margin-right margin-top max-height max-width min-height min-width object-fit order outline\n    outline-color outline-offset outline-style outline-width overflow overflow-x overflow-y padding\n    padding-bottom padding-left padding-right padding-top page-break-after page-break-before\n    page-break-inside resize scrollbar-arrow-color scrollbar-base-color scrollbar-darkshadow-color\n    scrollbar-face-color scrollbar-highlight-color scrollbar-shadow-color table-layout text-align\n    text-decoration text-decoration-color text-decoration-line text-decoration-style\n    text-decoration-thickness text-indent text-overflow text-shadow text-transform vertical-align\n    white-space width word-break word-spacing word-wrap".split(/\s+/)), Iu = /^\s*(?:javascript|vbscript|data:text\/html)/i, Lu = /* @__PURE__ */ new Set([
	"cite",
	"codebase",
	"data",
	"href",
	"longdesc",
	"poster",
	"src"
]);
function Ru(e) {
	let t = [], n = "", r = "", i = 0;
	for (let a of String(e || "")) r ? (n += a, a === r && (r = "")) : a === "\"" || a === "'" ? (r = a, n += a) : a === "(" ? (i++, n += a) : a === ")" ? (i = Math.max(0, i - 1), n += a) : a === ";" && i === 0 ? (t.push(n), n = "") : n += a;
	return n && t.push(n), t.map((e) => {
		let t = e.indexOf(":");
		return t < 1 ? null : [e.slice(0, t).trim().toLowerCase(), e.slice(t + 1).trim()];
	}).filter(Boolean);
}
function zu(e) {
	return e === "basefont" || e === "param" || e === "br" || e === "wbr" ? new Set(Pu[e]) : /* @__PURE__ */ new Set([...Nu, ...Pu[e] || []]);
}
function Bu(e) {
	let t = Ru(e.getAttribute("style")).map(([e, t]) => !Fu.has(e) || !t || /(?:expression\s*\(|javascript\s*:|behavior\s*:)/i.test(t) ? "" : `${e}:${t}`).filter(Boolean).join(";");
	t ? e.setAttribute("style", `${t};`) : e.removeAttribute("style");
}
function Vu(e) {
	let t = e.tagName.toLowerCase(), n = zu(t), r = (t === "div" || t === "img") && e.hasAttribute("editor_component");
	for (let i of Array.from(e.attributes)) {
		let a = i.name.toLowerCase(), o = i.value, s = a.startsWith("data-") && ku.has(t), c = r && !a.startsWith("on");
		if (a === "class" || a.startsWith("data-roundeditor-") || a.startsWith("on")) {
			e.removeAttribute(i.name);
			continue;
		}
		if (!n.has(a) && !s && !c) {
			e.removeAttribute(i.name);
			continue;
		}
		if (a === "style") {
			Bu(e);
			continue;
		}
		if (a === "contenteditable" && o.toLowerCase() !== "false") {
			e.removeAttribute(i.name);
			continue;
		}
		if ((Lu.has(a) || s) && Iu.test(o.replace(/\s+/g, ""))) {
			e.removeAttribute(i.name);
			continue;
		}
		if (a === "target" && !["_blank", "_self"].includes(o.toLowerCase())) {
			e.removeAttribute(i.name);
			continue;
		}
		a === "id" && o && !o.startsWith("user_content_") && e.setAttribute(i.name, `user_content_${o}`);
	}
}
function Hu(e, t = []) {
	let n = /* @__PURE__ */ new Set([...t, "class"]), r = Array.from(e.attributes).map((e) => e.name).filter((e) => e !== "class" && !e.startsWith("data-roundeditor-")), i = r.length ? { [Mu]: r } : {};
	for (let t of Array.from(e.attributes)) !n.has(t.name) && !t.name.startsWith("data-roundeditor-") && (i[t.name] = t.value);
	return Object.keys(i).length ? i : null;
}
function Y(e, t = {}) {
	let n = { ...e || {} }, r = Array.isArray(n[Mu]) ? n[Mu] : [];
	delete n[Mu];
	let i = { ...n };
	for (let [e, n] of Object.entries(t)) n == null || n === !1 ? delete i[e] : i[e] = n === !0 ? "" : String(n);
	let a = {};
	for (let e of r) Object.hasOwn(i, e) && (a[e] = i[e]);
	for (let [e, t] of Object.entries(i)) Object.hasOwn(a, e) || (a[e] = t);
	return a.style && (a["data-roundeditor-style"] = encodeURIComponent(a.style)), a;
}
function Uu(e, t, n = {}) {
	let r = { ...e || {} }, i = r[Mu];
	delete r[Mu];
	let a = new Map(Ru(r.style));
	for (let [e, n] of Object.entries(t)) n == null || n === "" ? a.delete(e) : a.set(e, String(n));
	return a.size ? r.style = `${Array.from(a, ([e, t]) => `${e}:${t}`).join(";")};` : delete r.style, i && (r[Mu] = i), Y(r, n);
}
//#endregion
//#region src/schema/marks.js
function Wu(e, t) {
	return {
		attrs: {
			tag: { default: t },
			extra: { default: null }
		},
		parseDOM: e.map((e) => ({
			tag: e,
			getAttrs: (e) => ({
				tag: e.tagName.toLowerCase(),
				extra: Hu(e)
			})
		})),
		toDOM: (e) => [
			e.attrs.tag || t,
			Y(e.attrs.extra),
			0
		]
	};
}
function Gu(e) {
	return {
		attrs: {
			value: {},
			extra: { default: null }
		},
		toDOM: (t) => [
			"span",
			Uu(t.attrs.extra, { [e]: t.attrs.value }),
			0
		]
	};
}
var Ku = {
	link: {
		inclusive: !1,
		attrs: {
			href: { default: "" },
			target: { default: null },
			rel: { default: null },
			extra: { default: null }
		},
		parseDOM: [{
			tag: "a[href]",
			getAttrs: (e) => ({
				href: e.getAttribute("href") || "",
				target: e.getAttribute("target"),
				rel: e.getAttribute("rel"),
				extra: Hu(e, [
					"href",
					"target",
					"rel"
				])
			})
		}],
		toDOM: (e) => [
			"a",
			Y(e.attrs.extra, {
				href: e.attrs.href,
				target: e.attrs.target,
				rel: e.attrs.rel
			}),
			0
		]
	},
	strong: Wu(["strong", "b"], "strong"),
	em: Wu(["em", "i"], "em"),
	underline: Wu(["u"], "u"),
	strike: Wu(["s", "strike"], "s"),
	code: Wu(["code"], "code"),
	sub: Wu(["sub"], "sub"),
	sup: Wu(["sup"], "sup"),
	fontSize: Gu("font-size"),
	fontColor: Gu("color"),
	bgColor: Gu("background-color"),
	fontFamily: Gu("font-family"),
	rawMark: {
		attrs: {
			tag: { default: "span" },
			extra: { default: null }
		},
		parseDOM: [{
			tag: "span:not([data-roundeditor-raw])",
			priority: 10,
			getAttrs: (e) => ({
				tag: "span",
				extra: Hu(e)
			})
		}, {
			tag: "font",
			getAttrs: (e) => ({
				tag: "font",
				extra: Hu(e)
			})
		}],
		toDOM: (e) => [
			e.attrs.tag,
			Y(e.attrs.extra),
			0
		]
	}
}, qu = "data-roundeditor-raw", Ju = `div[${qu}][data-roundeditor-kind="block"]`, Yu = `span[${qu}][data-roundeditor-kind="inline"]`, Xu = `div[${qu}][data-roundeditor-kind="component-block"]`, Zu = `span[${qu}][data-roundeditor-kind="component-inline"]`, Qu = `div[${qu}][data-roundeditor-kind="embed"]`;
function $u(e) {
	return encodeURIComponent(String(e || ""));
}
function ed(e) {
	try {
		return decodeURIComponent(String(e || ""));
	} catch {
		return "";
	}
}
function td(e, t, n) {
	return [e, {
		[qu]: $u(n),
		"data-roundeditor-kind": t
	}];
}
function nd(e) {
	return { html: ed(e.getAttribute(qu)) };
}
//#endregion
//#region src/schema/nodes.js
function X(e, t = []) {
	return Hu(e, t);
}
function rd(e) {
	return {
		align: e.style.getPropertyValue("text-align") || null,
		lineHeight: e.style.getPropertyValue("line-height") || null,
		indent: e.style.getPropertyValue("margin-left") || null,
		unwrap: e.hasAttribute("data-roundeditor-unwrap"),
		extra: X(e)
	};
}
function id(e, t = "p") {
	let n = Uu(e.attrs.extra, {
		"text-align": e.attrs.align,
		"line-height": e.attrs.lineHeight,
		"margin-left": e.attrs.indent
	});
	return e.attrs.unwrap && (n["data-roundeditor-unwrap"] = ""), [
		t,
		n,
		0
	];
}
function ad(e, t) {
	return Object.fromEntries(t.map((t) => [t, e.attrs[t]]));
}
var od = Nc({
	tableGroup: "block",
	cellContent: "block+",
	cellAttributes: { extra: {
		default: null,
		getFromDOM: (e) => X(e, [
			"colspan",
			"rowspan",
			"data-colwidth"
		]),
		setDOMAttr: (e, t) => Object.assign(t, Y(e))
	} }
}), sd = {
	doc: {
		content: "block+",
		attrs: { extra: { default: null } }
	},
	paragraph: {
		content: "inline*",
		group: "block",
		attrs: {
			align: { default: null },
			lineHeight: { default: null },
			indent: { default: null },
			unwrap: { default: !1 },
			extra: { default: null }
		},
		parseDOM: [{
			tag: "p",
			getAttrs: rd
		}],
		toDOM: (e) => id(e)
	},
	heading: {
		content: "inline*",
		group: "block",
		defining: !0,
		attrs: {
			level: { default: 2 },
			align: { default: null },
			lineHeight: { default: null },
			indent: { default: null },
			extra: { default: null }
		},
		parseDOM: [
			1,
			2,
			3,
			4,
			5,
			6
		].map((e) => ({
			tag: `h${e}`,
			getAttrs: (t) => ({
				level: e,
				align: t.style.getPropertyValue("text-align") || null,
				lineHeight: t.style.getPropertyValue("line-height") || null,
				indent: t.style.getPropertyValue("margin-left") || null,
				extra: X(t)
			})
		})),
		toDOM: (e) => [
			`h${e.attrs.level}`,
			Uu(e.attrs.extra, {
				"text-align": e.attrs.align,
				"line-height": e.attrs.lineHeight,
				"margin-left": e.attrs.indent
			}),
			0
		]
	},
	blockquote: {
		content: "block+",
		group: "block",
		defining: !0,
		attrs: { extra: { default: null } },
		parseDOM: [{
			tag: "blockquote",
			getAttrs: (e) => ({ extra: X(e) })
		}],
		toDOM: (e) => [
			"blockquote",
			Y(e.attrs.extra),
			0
		]
	},
	codeBlock: {
		content: "text*",
		marks: "",
		group: "block",
		code: !0,
		defining: !0,
		attrs: {
			extra: { default: null },
			codeExtra: { default: null }
		},
		parseDOM: [{
			tag: "pre",
			preserveWhitespace: "full",
			getAttrs: (e) => ({
				extra: X(e),
				codeExtra: e.firstElementChild?.tagName === "CODE" ? X(e.firstElementChild) : null
			})
		}],
		toDOM: (e) => [
			"pre",
			Y(e.attrs.extra),
			[
				"code",
				Y(e.attrs.codeExtra),
				0
			]
		]
	},
	horizontalRule: {
		group: "block",
		atom: !0,
		attrs: { extra: { default: null } },
		parseDOM: [{
			tag: "hr",
			getAttrs: (e) => ({ extra: X(e) })
		}],
		toDOM: (e) => ["hr", Y(e.attrs.extra)]
	},
	orderedList: {
		content: "listItem+",
		group: "block",
		attrs: {
			order: { default: 1 },
			extra: { default: null }
		},
		parseDOM: [{
			tag: "ol",
			getAttrs: (e) => ({
				order: Number(e.getAttribute("start") || 1),
				extra: X(e, ["start"])
			})
		}],
		toDOM: (e) => [
			"ol",
			Y(e.attrs.extra, { start: e.attrs.order === 1 ? null : e.attrs.order }),
			0
		]
	},
	bulletList: {
		content: "listItem+",
		group: "block",
		attrs: { extra: { default: null } },
		parseDOM: [{
			tag: "ul",
			getAttrs: (e) => ({ extra: X(e) })
		}],
		toDOM: (e) => [
			"ul",
			Y(e.attrs.extra),
			0
		]
	},
	listItem: {
		content: "paragraph block*",
		defining: !0,
		attrs: { extra: { default: null } },
		parseDOM: [{
			tag: "li",
			getAttrs: (e) => ({ extra: X(e) })
		}],
		toDOM: (e) => [
			"li",
			Y(e.attrs.extra),
			0
		]
	},
	sticker: {
		inline: !0,
		group: "inline",
		atom: !0,
		draggable: !0,
		selectable: !0,
		attrs: {
			stickerSrl: { default: null },
			fileSrl: { default: null },
			mediaType: { default: "image" },
			src: { default: "" },
			title: { default: "" },
			width: { default: null },
			height: { default: null },
			extra: { default: null }
		},
		parseDOM: [{
			tag: "img[data-rx-sticker]",
			priority: 100,
			getAttrs: (e) => {
				let [t, n] = String(e.getAttribute("data-rx-sticker") || "").split("|");
				return {
					stickerSrl: t || null,
					fileSrl: n || null,
					mediaType: e.getAttribute("data-rx-sticker-type") || "image",
					src: e.getAttribute("src") || "",
					title: e.getAttribute("alt") || "",
					width: e.getAttribute("width"),
					height: e.getAttribute("height"),
					extra: X(e, [
						"data-rx-sticker",
						"data-rx-sticker-type",
						"src",
						"alt",
						"width",
						"height"
					])
				};
			}
		}],
		toDOM: (e) => ["img", Y(e.attrs.extra, {
			src: e.attrs.src,
			alt: e.attrs.title,
			width: e.attrs.width,
			height: e.attrs.height,
			"data-rx-sticker": `${e.attrs.stickerSrl}|${e.attrs.fileSrl}`,
			"data-rx-sticker-type": e.attrs.mediaType
		})]
	},
	image: {
		inline: !0,
		group: "inline",
		atom: !0,
		draggable: !0,
		selectable: !0,
		attrs: {
			src: { default: "" },
			alt: { default: "" },
			width: { default: null },
			height: { default: null },
			displayWidth: { default: null },
			displayHeight: { default: null },
			fileSrl: { default: null },
			editorComponent: { default: null },
			extra: { default: null }
		},
		parseDOM: [{
			tag: "img:not([data-rx-sticker])",
			getAttrs: (e) => ({
				src: e.getAttribute("src") || "",
				alt: e.getAttribute("alt") || "",
				width: e.getAttribute("width"),
				height: e.getAttribute("height"),
				displayWidth: e.style.getPropertyValue("width") || null,
				displayHeight: e.style.getPropertyValue("height") || null,
				fileSrl: e.getAttribute("data-file-srl"),
				editorComponent: e.getAttribute("editor_component"),
				extra: X(e, [
					"src",
					"alt",
					"width",
					"height",
					"data-file-srl",
					"editor_component"
				])
			})
		}],
		toDOM: (e) => ["img", Uu(e.attrs.extra, {
			width: e.attrs.displayWidth,
			height: e.attrs.displayHeight
		}, {
			src: e.attrs.src,
			alt: e.attrs.alt,
			width: e.attrs.width,
			height: e.attrs.height,
			"data-file-srl": e.attrs.fileSrl,
			editor_component: e.attrs.editorComponent
		})]
	},
	video: {
		group: "block",
		atom: !0,
		draggable: !0,
		selectable: !0,
		attrs: {
			src: { default: "" },
			poster: { default: null },
			width: { default: null },
			height: { default: null },
			fileSrl: { default: null },
			controls: { default: !1 },
			muted: { default: !1 },
			autoplay: { default: !1 },
			loop: { default: !1 },
			playsinline: { default: !1 },
			extra: { default: null }
		},
		parseDOM: [{
			tag: "video",
			getAttrs: (e) => ({
				src: e.getAttribute("src") || "",
				poster: e.getAttribute("poster"),
				width: e.getAttribute("width"),
				height: e.getAttribute("height"),
				fileSrl: e.getAttribute("data-file-srl"),
				controls: e.hasAttribute("controls"),
				muted: e.hasAttribute("muted"),
				autoplay: e.hasAttribute("autoplay"),
				loop: e.hasAttribute("loop"),
				playsinline: e.hasAttribute("playsinline"),
				extra: X(e, [
					"src",
					"poster",
					"width",
					"height",
					"data-file-srl",
					"controls",
					"muted",
					"autoplay",
					"loop",
					"playsinline"
				])
			})
		}],
		toDOM: (e) => ["video", Y(e.attrs.extra, {
			src: e.attrs.src,
			poster: e.attrs.poster,
			width: e.attrs.width,
			height: e.attrs.height,
			"data-file-srl": e.attrs.fileSrl,
			...ad(e, [
				"controls",
				"muted",
				"autoplay",
				"loop",
				"playsinline"
			])
		})]
	},
	hardBreak: {
		inline: !0,
		group: "inline",
		selectable: !1,
		attrs: { extra: { default: null } },
		parseDOM: [{
			tag: "br",
			getAttrs: (e) => ({ extra: X(e) })
		}],
		toDOM: (e) => ["br", Y(e.attrs.extra)]
	},
	embed: {
		group: "block",
		atom: !0,
		selectable: !0,
		attrs: {
			html: {},
			extra: { default: null }
		},
		parseDOM: [{
			tag: Qu,
			getAttrs: nd
		}],
		toDOM: (e) => td("div", "embed", e.attrs.html)
	},
	rhymixComponentBlock: {
		group: "block",
		atom: !0,
		selectable: !0,
		draggable: !0,
		attrs: {
			html: {},
			extra: { default: null }
		},
		parseDOM: [{
			tag: Xu,
			getAttrs: nd
		}],
		toDOM: (e) => td("div", "component-block", e.attrs.html)
	},
	rhymixComponentInline: {
		inline: !0,
		group: "inline",
		atom: !0,
		selectable: !0,
		draggable: !0,
		attrs: {
			html: {},
			extra: { default: null }
		},
		parseDOM: [{
			tag: Zu,
			getAttrs: nd
		}],
		toDOM: (e) => td("span", "component-inline", e.attrs.html)
	},
	rawBlock: {
		group: "block",
		atom: !0,
		selectable: !0,
		draggable: !0,
		attrs: {
			html: {},
			extra: { default: null }
		},
		parseDOM: [{
			tag: Ju,
			getAttrs: nd
		}],
		toDOM: (e) => td("div", "block", e.attrs.html)
	},
	rawInline: {
		inline: !0,
		group: "inline",
		atom: !0,
		selectable: !0,
		draggable: !0,
		attrs: {
			html: {},
			extra: { default: null }
		},
		parseDOM: [{
			tag: Yu,
			getAttrs: nd
		}],
		toDOM: (e) => td("span", "inline", e.attrs.html)
	},
	table: {
		...od.table,
		content: "tableRow+",
		attrs: { extra: { default: null } },
		parseDOM: [{
			tag: "table",
			getAttrs: (e) => ({ extra: X(e) })
		}],
		toDOM: (e) => [
			"table",
			Y(e.attrs.extra),
			["tbody", 0]
		]
	},
	tableRow: {
		...od.table_row,
		content: "(tableCell | tableHeader)*",
		attrs: { extra: { default: null } },
		parseDOM: [{
			tag: "tr",
			getAttrs: (e) => ({ extra: X(e) })
		}],
		toDOM: (e) => [
			"tr",
			Y(e.attrs.extra),
			0
		]
	},
	tableCell: od.table_cell,
	tableHeader: od.table_header,
	text: { group: "inline" }
}, cd = new Set("a b blockquote br code em font h1 h2 h3 h4 h5 h6 hr i img li ol p pre s span strike strong sub\n    sup table tbody td th tr u ul video".split(/\s+/)), ld = new Set("script style form input button select textarea canvas svg".split(" "));
function ud(e, t) {
	let n = t === "inline" || t === "component-inline", r = document.createElement(n ? "span" : "div");
	r.setAttribute(qu, $u(e.outerHTML)), r.setAttribute("data-roundeditor-kind", t), e.replaceWith(r);
}
function dd(e) {
	let t = e.parentNode;
	if (t) {
		for (; e.firstChild;) t.insertBefore(e.firstChild, e);
		e.remove();
	}
}
function fd(e) {
	for (let t of Array.from(e.querySelectorAll("*")).reverse()) {
		let e = t.tagName.toLowerCase();
		ld.has(e) ? t.remove() : Ou.has(e) ? Vu(t) : dd(t);
	}
}
function pd(e) {
	if (Array.from(e.childNodes).some((e) => e.nodeType !== Node.ELEMENT_NODE)) return !1;
	let t = Array.from(e.children);
	return !t.some((e) => e.tagName !== "TBODY") && t.every((e) => !Array.from(e.childNodes).some((e) => e.nodeType !== Node.ELEMENT_NODE) && Array.from(e.children).every((e) => e.tagName === "TR" && !Array.from(e.childNodes).some((e) => e.nodeType !== Node.ELEMENT_NODE) && Array.from(e.children).every((e) => ["TD", "TH"].includes(e.tagName))));
}
function md(e) {
	return !Array.from(e.childNodes).some((e) => e.nodeType !== Node.ELEMENT_NODE) && Array.from(e.children).every((e) => e.tagName === "LI");
}
function hd(e) {
	return e.children.length === 1 && e.firstElementChild === e.lastElementChild && e.firstElementChild.tagName === "CODE";
}
function gd(e) {
	return e.children.length === 0 && !e.textContent.trim();
}
function _d(e) {
	let t = e.tagName.toLowerCase();
	return t === "a" ? e.hasAttribute("href") : t === "li" ? ["OL", "UL"].includes(e.parentElement?.tagName) : t === "tbody" ? e.parentElement?.tagName === "TABLE" : t === "tr" ? e.parentElement?.tagName === "TBODY" : t === "td" || t === "th" ? e.parentElement?.tagName === "TR" : t === "table" ? pd(e) : t === "ol" || t === "ul" ? md(e) : t === "pre" ? hd(e) : t !== "video" || gd(e);
}
function vd(e) {
	let t = e.tagName.toLowerCase();
	if (ld.has(t)) {
		e.remove();
		return;
	}
	if (!Ou.has(t)) {
		for (let t of Array.from(e.children)) vd(t);
		dd(e);
		return;
	}
	Vu(e);
	let n = e.getAttribute("editor_component"), r = t === "img" && n === "image_link", i = t === "div" && e.hasAttribute("data-oembed-url"), a = cd.has(t) && _d(e);
	if (n && !r || i || !a) {
		fd(e), ud(e, n ? Au.has(t) ? "component-block" : "component-inline" : i ? "embed" : Au.has(t) ? "block" : "inline");
		return;
	}
	for (let t of Array.from(e.children)) vd(t);
}
function yd(e) {
	if (e.nodeType !== Node.ELEMENT_NODE) return !1;
	let t = e;
	return t.getAttribute("data-roundeditor-kind") === "block" || t.getAttribute("data-roundeditor-kind") === "component-block" || t.getAttribute("data-roundeditor-kind") === "embed" || Au.has(t.tagName.toLowerCase());
}
function bd(e) {
	if (!Array.from(e.childNodes).some(yd)) return;
	let t = e.parentNode, n = null;
	for (let r of Array.from(e.childNodes)) {
		if (yd(r)) {
			n = null, t.insertBefore(r, e);
			continue;
		}
		n || (n = e.cloneNode(!1), t.insertBefore(n, e)), n.appendChild(r);
	}
	e.remove();
}
function xd(e, t = !1) {
	let n = null, r = !1;
	for (let t of Array.from(e.childNodes)) {
		if (yd(t)) {
			n = null;
			continue;
		}
		n || (n = document.createElement("p"), n.setAttribute("data-roundeditor-unwrap", ""), e.insertBefore(n, t)), n.appendChild(t), (t.nodeType !== Node.TEXT_NODE || t.nodeValue) && (r = !0);
	}
	t && !r && !e.querySelector(":scope > p") && (n = document.createElement("p"), n.setAttribute("data-roundeditor-unwrap", ""), e.insertBefore(n, e.firstChild));
}
function Sd(e) {
	let t = document.createElement("template");
	t.innerHTML = String(e || "");
	for (let e of Array.from(t.content.children)) vd(e);
	for (let e of Array.from(t.content.querySelectorAll("p"))) bd(e);
	for (let e of Array.from(t.content.querySelectorAll("li,td,th,blockquote"))) xd(e, !0);
	return xd(t.content, !1), t.content.childNodes.length || (t.innerHTML = "<p></p>"), t.innerHTML;
}
//#endregion
//#region src/schema/serialize.js
function Cd(e) {
	let t = [], n = "", r = "", i = 0;
	for (let a of String(e || "")) r ? (n += a, a === r && (r = "")) : a === "\"" || a === "'" ? (r = a, n += a) : a === "(" ? (i++, n += a) : a === ")" ? (i = Math.max(0, i - 1), n += a) : a === ";" && i === 0 ? (t.push(n), n = "") : n += a;
	return n && t.push(n), t.map((e) => {
		let t = e.indexOf(":");
		return t < 1 ? null : [e.slice(0, t).trim().toLowerCase(), e.slice(t + 1).trim()];
	}).filter(Boolean);
}
function wd(e) {
	let t = !0;
	for (; t;) {
		t = !1;
		for (let n of Array.from(e.querySelectorAll("span[style]"))) {
			if (n.attributes.length !== 1 || n.childNodes.length !== 1) continue;
			let e = n.firstElementChild;
			if (!e || e.tagName !== "SPAN" || e.attributes.length !== 1 || !e.hasAttribute("style")) continue;
			let r = new Map(Cd(n.getAttribute("style")));
			for (let [t, n] of Cd(e.getAttribute("style"))) r.set(t, n);
			e.setAttribute("style", `${Array.from(r, ([e, t]) => `${e}:${t}`).join(";")};`), n.replaceWith(e), t = !0;
		}
	}
}
function Td(e) {
	for (let t of Array.from(e.querySelectorAll("[data-roundeditor-style]"))) {
		try {
			t.setAttribute("style", decodeURIComponent(t.getAttribute("data-roundeditor-style")));
		} catch {
			t.removeAttribute("style");
		}
		t.removeAttribute("data-roundeditor-style");
	}
}
function Ed(e) {
	for (let t of Array.from(e.querySelectorAll(`[${qu}]`))) {
		let e = document.createElement("template");
		e.innerHTML = ed(t.getAttribute(qu)), t.replaceWith(...Array.from(e.content.childNodes));
	}
	for (let t of Array.from(e.querySelectorAll("p[data-roundeditor-unwrap]"))) t.replaceWith(...Array.from(t.childNodes));
}
function Dd(e) {
	let t = Array.from(ju).join("|");
	return e.replace(RegExp(`<(${t})(\\s[^<>]*?)?>`, "gi"), (e) => /\/\s*>$/.test(e) ? e : `${e.slice(0, -1).trimEnd()} />`);
}
function Od(e) {
	return e.replace(/&nbsp;/g, "\xA0");
}
function kd(e, t) {
	let n = document.createElement("div");
	return n.appendChild(Qe.fromSchema(t).serializeFragment(e.content)), Td(n), wd(n), Ed(n), Od(Dd(n.innerHTML));
}
//#endregion
//#region src/schema/textStyles.js
var Ad = {
	"font-size": "fontSize",
	color: "fontColor",
	"background-color": "bgColor",
	"font-family": "fontFamily"
}, jd = "__roundeditorAttributeOrder";
function Md(e, t) {
	let n = e.marks.find((e) => e.type === t.marks.rawMark && e.attrs.tag === "span");
	if (!n?.attrs.extra?.style) return e;
	let r = Ru(n.attrs.extra.style), i = [], a = [];
	for (let [e, n] of r) {
		let r = Ad[e];
		r ? i.push(t.marks[r].create({ value: n })) : a.push([e, n]);
	}
	if (!i.length) return e;
	let o = e.marks.filter((e) => e !== n && !i.some((t) => t.type === e.type)), s = { ...n.attrs.extra };
	return a.length ? s.style = `${a.map(([e, t]) => `${e}:${t}`).join(";")};` : (delete s.style, Array.isArray(s[jd]) && (s[jd] = s[jd].filter((e) => e !== "style"))), Object.entries(s).some(([e, t]) => e !== jd || Array.isArray(t) && t.length > 0) && o.push(t.marks.rawMark.create({
		...n.attrs,
		extra: s
	})), o.push(...i), t.text(e.text, l.setFrom(o));
}
function Nd(e, t) {
	return e.isText ? Md(e, t) : e.isLeaf ? e : e.type.create(e.attrs, a.fromArray(e.content.content.map((e) => Nd(e, t))), e.marks);
}
function Pd(e, t) {
	return Nd(e, t);
}
function Fd(e, t) {
	return new d(a.fromArray(e.content.content.map((e) => Nd(e, t))), e.openStart, e.openEnd);
}
//#endregion
//#region src/schema/index.js
var Z = new Pe({
	nodes: sd,
	marks: Ku
});
function Id(e) {
	let t = document.createElement("template");
	return t.innerHTML = Sd(e), Pd(Re.fromSchema(Z).parse(t.content, { preserveWhitespace: "full" }), Z);
}
function Ld(e) {
	let t = document.createElement("template");
	return t.innerHTML = Sd(e), Fd(Re.fromSchema(Z).parseSlice(t.content, { preserveWhitespace: "full" }), Z);
}
//#endregion
//#region node_modules/prosemirror-schema-list/dist/index.js
function Rd(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a);
		if (!o) return !1;
		let s = r ? n.tr : null;
		return zd(s, o, e, t) ? (r && r(s.scrollIntoView()), !0) : !1;
	};
}
function zd(e, t, n, r = null) {
	let i = !1, a = t, o = t.$from.doc;
	if (t.depth >= 2 && t.$from.node(t.depth - 1).type.compatibleContent(n) && t.startIndex == 0) {
		if (t.$from.index(t.depth - 1) == 0) return !1;
		let e = o.resolve(t.start - 2);
		a = new se(e, e, t.depth), t.endIndex < t.parent.childCount && (t = new se(t.$from, o.resolve(t.$to.end(t.depth)), t.depth)), i = !0;
	}
	let s = jt(a, n, r, t);
	return s ? (e && Bd(e, t, s, i, n), !0) : !1;
}
function Bd(e, t, n, r, i) {
	let o = a.empty;
	for (let e = n.length - 1; e >= 0; e--) o = a.from(n[e].type.create(n[e].attrs, o));
	e.step(new C(t.start - (r ? 2 : 0), t.end, t.start, t.end, new d(o, 0, 0), n.length, !0));
	let s = 0;
	for (let e = 0; e < n.length; e++) n[e].type == i && (s = e + 1);
	let c = n.length - s, l = t.start + n.length - (r ? 2 : 0), u = t.parent;
	for (let n = t.startIndex, r = t.endIndex, i = !0; n < r; n++, i = !1) !i && Vt(e.doc, l, c) && (e.split(l, c), l += 2 * c), l += u.child(n).nodeSize;
	return e;
}
function Vd(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, a = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		return a ? n ? r.node(a.depth - 1).type == e ? Hd(t, n, e, a) : Ud(t, n, a) : !0 : !1;
	};
}
function Hd(e, t, n, r) {
	let i = e.tr, o = r.end, s = r.$to.end(r.depth);
	o < s && (i.step(new C(o - 1, s, o, s, new d(a.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new se(i.doc.resolve(r.$from.pos), i.doc.resolve(s), r.depth));
	let c = kt(r);
	if (c == null) return !1;
	i.lift(r, c);
	let l = i.doc.resolve(i.mapping.map(o, -1) - 1);
	return Ut(i.doc, l.pos) && l.nodeBefore.type == l.nodeAfter.type && i.join(l.pos), t(i.scrollIntoView()), !0;
}
function Ud(e, t, n) {
	let r = e.tr, i = n.parent;
	for (let e = n.end, t = n.endIndex - 1, a = n.startIndex; t > a; t--) e -= i.child(t).nodeSize, r.delete(e - 1, e + 1);
	let o = r.doc.resolve(n.start), s = o.nodeAfter;
	if (r.mapping.map(n.end) != n.start + o.nodeAfter.nodeSize) return !1;
	let c = n.startIndex == 0, l = n.endIndex == i.childCount, u = o.node(-1), f = o.index(-1);
	if (!u.canReplace(f + +!c, f + 1, s.content.append(l ? a.empty : a.from(i)))) return !1;
	let p = o.pos, m = p + s.nodeSize;
	return r.step(new C(p - +!!c, m + +!!l, p + 1, m - 1, new d((c ? a.empty : a.from(i.copy(a.empty))).append(l ? a.empty : a.from(i.copy(a.empty))), +!c, +!l), +!c)), t(r.scrollIntoView()), !0;
}
function Wd(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, o = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		if (!o) return !1;
		let s = o.startIndex;
		if (s == 0) return !1;
		let c = o.parent, l = c.child(s - 1);
		if (l.type != e) return !1;
		if (n) {
			let r = l.lastChild && l.lastChild.type == c.type, i = a.from(r ? e.create() : null), s = new d(a.from(e.create(null, a.from(c.type.create(null, i)))), r ? 3 : 1, 0), u = o.start, f = o.end;
			n(t.tr.step(new C(u - (r ? 3 : 1), f, u, f, s, 1, !0)).scrollIntoView());
		}
		return !0;
	};
}
//#endregion
//#region src/ui/commands.js
var Gd = [
	8,
	9,
	10,
	11,
	12,
	14,
	18,
	24,
	30,
	36,
	48,
	60,
	72,
	96
], Kd = [
	"1",
	"1.2",
	"1.4",
	"1.6",
	"1.8",
	"2"
], qd = /* @__PURE__ */ "#000000.#434343.#666666.#999999.#b7b7b7.#cccccc.#ffffff.#980000.#ff0000.#ff9900.#ffff00.#00ff00.#00ffff.#4a86e8.#0000ff.#9900ff.#ff00ff.#e25041.#f6b26b.#ffd966.#93c47d.#76a5af.#6d9eeb.#674ea7.#c27ba0.#a61c00.#38761d".split(".");
function Q(e, t) {
	let n = t(e.state, e.dispatch, e);
	return n && e.focus(), n;
}
function Jd(e, t) {
	let { empty: n, from: r, to: i, $from: a } = e.selection;
	return n ? !!t.isInSet(e.storedMarks || a.marks()) : e.doc.rangeHasMark(r, i, t);
}
function Yd(e, t, n = null) {
	let { $from: r, from: i, to: a } = e.selection;
	for (let e = r.depth; e > 0; e--) {
		let i = r.node(e);
		if (i.type === t) return !n || Object.entries(n).every(([e, t]) => i.attrs[e] === t);
	}
	let o = !1;
	return e.doc.nodesBetween(i, a, (e) => {
		e.type === t && (!n || Object.entries(n).every(([t, n]) => e.attrs[t] === n)) && (o = !0);
	}), o;
}
function Xd(e, t) {
	if (e.selection.$from.parent.isTextblock) return e.selection.$from.parent.attrs[t] ?? null;
	let n = null;
	return e.doc.nodesBetween(e.selection.from, e.selection.to, (e) => {
		n === null && e.isTextblock && (n = e.attrs[t] ?? null);
	}), n;
}
function Zd(e) {
	return pr(e);
}
function Qd(e, t) {
	return (n, r) => {
		let { from: i, to: a, empty: o, $from: s } = n.selection;
		if (!r) return !0;
		let c = n.tr;
		if (o) {
			let r = e.isInSet(n.storedMarks || s.marks());
			r && c.removeStoredMark(r), t && c.addStoredMark(e.create({ value: t }));
		} else c.removeMark(i, a, e), t && c.addMark(i, a, e.create({ value: t }));
		return r(c.scrollIntoView()), !0;
	};
}
function $d(e) {
	let t = [], { from: n, to: r, $from: i } = e.selection;
	return e.doc.nodesBetween(n, r, (e, n) => {
		e.isTextblock && t.push(n);
	}), !t.length && i.parent.isTextblock && t.push(i.before(i.depth)), [...new Set(t)];
}
function ef(e) {
	return (t, n) => {
		let r = $d(t).filter((e) => {
			let n = t.doc.nodeAt(e)?.type;
			return n === t.schema.nodes.paragraph || n === t.schema.nodes.heading;
		});
		if (!r.length) return !1;
		if (!n) return !0;
		let i = t.tr;
		for (let t of r) {
			let n = i.doc.nodeAt(t);
			n && i.setNodeMarkup(t, null, {
				...n.attrs,
				...e
			});
		}
		return n(i.scrollIntoView()), !0;
	};
}
function tf(e) {
	return (t, n, r) => {
		if (Yd(t, t.schema.nodes.listItem) && (e > 0 ? Wd(t.schema.nodes.listItem) : Vd(t.schema.nodes.listItem))(t, n, r)) return !0;
		let i = $d(t).filter((e) => {
			let n = t.doc.nodeAt(e)?.type;
			return n === t.schema.nodes.paragraph || n === t.schema.nodes.heading;
		});
		if (!i.length) return !1;
		if (!n) return !0;
		let a = t.tr;
		for (let t of i) {
			let n = a.doc.nodeAt(t);
			if (!n) continue;
			let r = Number.parseFloat(n.attrs.indent || "0") || 0, i = Math.max(0, r + e * 40);
			a.setNodeMarkup(t, null, {
				...n.attrs,
				indent: i ? `${i}px` : null
			});
		}
		return n(a.scrollIntoView()), !0;
	};
}
function nf(e) {
	return (t, n, r) => e === "code" ? ur(t.schema.nodes.codeBlock)(t, n, r) : e === "normal" ? ur(t.schema.nodes.paragraph)(t, n, r) : ur(t.schema.nodes.heading, { level: Number(e.slice(1)) })(t, n, r);
}
function rf(e) {
	return (t, n, r) => Yd(t, e.nodes.blockquote) ? Yn(t, n, r) : lr(e.nodes.blockquote)(t, n, r);
}
function af(e, t) {
	return (n, r, i) => Yd(n, e) ? Vd(t)(n, r, i) : Rd(e)(n, r, i);
}
function of(e, t) {
	if (!t) return !0;
	let { from: n, to: r, empty: i } = e.selection, a = $d(e).filter((t) => {
		let n = e.doc.nodeAt(t)?.type;
		return n === e.schema.nodes.paragraph || n === e.schema.nodes.heading;
	}), o = e.tr;
	if (i) for (let t of e.storedMarks || e.selection.$from.marks()) o.removeStoredMark(t);
	else for (let t of Object.values(e.schema.marks)) o.removeMark(n, r, t);
	for (let e of a) {
		let t = o.doc.nodeAt(e);
		t && o.setNodeMarkup(e, null, {
			...t.attrs,
			align: null,
			lineHeight: null,
			indent: null
		});
	}
	return t(o.scrollIntoView()), !0;
}
function sf(e, t = !0) {
	return (n, r) => {
		let { from: i, to: a, empty: o } = n.selection;
		if (!r) return !0;
		let s = n.tr;
		return o ? s.addStoredMark(n.schema.marks.link.create({
			href: e,
			target: t ? "_blank" : null,
			rel: t ? "noreferrer noopener" : null
		})) : (s.removeMark(i, a, n.schema.marks.link), s.addMark(i, a, n.schema.marks.link.create({
			href: e,
			target: t ? "_blank" : null,
			rel: t ? "noreferrer noopener" : null
		}))), r(s.scrollIntoView()), !0;
	};
}
function cf(e, t) {
	let { from: n, to: r, empty: i } = e.selection;
	if (!t) return !0;
	let a = e.tr;
	return i ? a.removeStoredMark(e.schema.marks.link) : a.removeMark(n, r, e.schema.marks.link), t(a.scrollIntoView()), !0;
}
function lf(e, t) {
	return (n, r) => {
		let { schema: i } = n;
		if (!i.nodes.table || !i.nodes.tableRow || !i.nodes.tableCell) return !1;
		if (!r) return !0;
		let a = [];
		for (let n = 0; n < e; n++) {
			let e = [];
			for (let n = 0; n < t; n++) e.push(i.nodes.tableCell.createAndFill());
			a.push(i.nodes.tableRow.create(null, e));
		}
		let o = i.nodes.table.create(null, a);
		return r(n.tr.replaceSelectionWith(o).scrollIntoView()), !0;
	};
}
function uf(e, t) {
	return t && t(e.tr.replaceSelectionWith(e.schema.nodes.horizontalRule.create()).scrollIntoView()), !0;
}
function df(e) {
	return (t, n) => (n && n(t.tr.insertText(e).scrollIntoView()), !0);
}
function ff(e, t, n) {
	return rr(e, t, n);
}
//#endregion
//#region src/ui/panels/LinkPanel.js
function pf(e) {
	let t = e.trim();
	return !t || /^\s*(?:javascript|vbscript|data):/i.test(t) ? null : t;
}
function mf({ labels: e, onApply: t, onRemove: n, onClose: r }) {
	let i = document.createElement("form");
	i.className = "roundeditor__panel-form", i.noValidate = !0, i.innerHTML = `
        <label class="roundeditor__field roundeditor__field--grow">
            <span>${e.url}</span>
            <input type="url" name="href" inputmode="url" placeholder="https://" autocomplete="url">
        </label>
        <label class="roundeditor__check">
            <input type="checkbox" name="target" checked>
            <span>${e.newWindow}</span>
        </label>
        <span class="roundeditor__panel-error" role="alert"></span>
        <div class="roundeditor__panel-actions">
            <button type="button" class="roundeditor__button roundeditor__button--text" data-action="remove">${e.remove}</button>
            <button type="button" class="roundeditor__button roundeditor__button--text" data-action="cancel">${e.cancel}</button>
            <button type="submit" class="roundeditor__button roundeditor__button--primary">${e.apply}</button>
        </div>
    `;
	let a = i.elements.namedItem("href"), o = i.querySelector(".roundeditor__panel-error");
	return i.addEventListener("submit", (n) => {
		n.preventDefault();
		let r = pf(a.value);
		if (!r) {
			o.textContent = e.invalidUrl, a.focus();
			return;
		}
		o.textContent = "", t(r, i.elements.namedItem("target").checked);
	}), i.querySelector("[data-action=\"remove\"]").addEventListener("click", n), i.querySelector("[data-action=\"cancel\"]").addEventListener("click", r), queueMicrotask(() => a.focus()), i;
}
//#endregion
//#region src/ui/panels/ImagePanel.js
function hf(e) {
	return e ? new Promise((t) => {
		let n = new window.Image();
		n.onload = () => t({
			width: n.naturalWidth,
			height: n.naturalHeight
		}), n.onerror = () => t(null), n.src = e;
	}) : Promise.resolve(null);
}
function gf(e) {
	return lu(e).map((e) => ({
		file: e,
		preview: typeof URL.createObjectURL == "function" ? URL.createObjectURL(e) : "",
		dimensions: null
	}));
}
function _f(e, t = "") {
	let n = document.createElement("button");
	return n.type = "button", n.className = `roundeditor__button${t ? ` ${t}` : ""}`, n.textContent = e, n;
}
function vf({ bridge: e, labels: t, onClose: n }) {
	let r = document.createElement("div");
	r.className = "roundeditor__image-panel";
	let i = [], a = !1, o = document.createElement("div");
	o.className = "roundeditor__image-policy";
	for (let e of [t.imageExifPolicy, t.imageFilenamePolicy]) {
		let t = document.createElement("label");
		t.className = "roundeditor__check";
		let n = document.createElement("input");
		n.type = "checkbox", n.checked = !0, n.disabled = !0, t.append(n, document.createTextNode(e)), o.appendChild(t);
	}
	let s = document.createElement("input");
	s.type = "file", s.accept = "image/*", s.multiple = !0, s.hidden = !0;
	let c = document.createElement("button");
	c.type = "button", c.className = "roundeditor__image-dropzone", c.textContent = t.imageDropzone, c.addEventListener("click", () => s.click());
	let l = document.createElement("div");
	l.className = "roundeditor__image-thumbnails", l.setAttribute("aria-live", "polite");
	let u = document.createElement("p");
	u.className = "roundeditor__panel-error", u.hidden = !0;
	let d = document.createElement("div");
	d.className = "roundeditor__image-actions";
	let f = document.createElement("label");
	f.className = "roundeditor__field", f.appendChild(document.createTextNode(t.imageAlign));
	let p = document.createElement("select");
	for (let [e, n] of [
		["", t.alignLeft],
		["center", t.alignCenter],
		["right", t.alignRight]
	]) {
		let t = document.createElement("option");
		t.value = e, t.textContent = n, p.appendChild(t);
	}
	f.appendChild(p);
	let m = _f(t.cancel, "roundeditor__button--text"), h = _f(t.insert, "roundeditor__button--primary");
	d.append(f, m, h);
	function g(e) {
		e.preview && typeof URL.revokeObjectURL == "function" && URL.revokeObjectURL(e.preview);
	}
	function _() {
		l.replaceChildren();
		for (let [e, n] of i.entries()) {
			let r = document.createElement("div");
			if (r.className = "roundeditor__image-thumbnail", n.preview) {
				let e = document.createElement("img");
				e.src = n.preview, e.alt = "", r.appendChild(e);
			}
			let a = document.createElement("span");
			a.textContent = n.file.name;
			let o = _f("×", "roundeditor__image-remove");
			o.setAttribute("aria-label", `${t.remove}: ${n.file.name}`), o.addEventListener("click", () => {
				g(n), i.splice(e, 1), _();
			}), r.append(a, o), l.appendChild(r);
		}
		h.disabled = a || i.length === 0;
	}
	async function v(e) {
		let n = gf(e);
		if (!n.length) {
			u.textContent = t.imageOnly, u.hidden = !1;
			return;
		}
		u.hidden = !0, i.push(...n), _(), await Promise.all(n.map(async (e) => {
			e.dimensions = await hf(e.preview);
		}));
	}
	s.addEventListener("change", () => {
		v(s.files), s.value = "";
	});
	for (let e of ["dragenter", "dragover"]) c.addEventListener(e, (e) => {
		e.preventDefault(), c.classList.add("roundeditor__image-dropzone--active");
	});
	return c.addEventListener("dragleave", () => c.classList.remove("roundeditor__image-dropzone--active")), c.addEventListener("drop", (e) => {
		e.preventDefault(), c.classList.remove("roundeditor__image-dropzone--active"), v(e.dataTransfer?.files);
	}), m.addEventListener("click", n), h.addEventListener("click", async () => {
		if (!(a || !i.length)) {
			a = !0, u.hidden = !0, h.disabled = !0;
			try {
				fu(e, await cu(e, i, (e, t) => {
					let n = l.children[e];
					n && n.style.setProperty("--roundeditor-upload-progress", `${Math.round(t * 100)}%`);
				}), { align: p.value || null }), n();
			} catch (e) {
				u.textContent = e.message, u.hidden = !1, a = !1, _();
			}
		}
	}), r.addEventListener("roundeditor:close", () => i.forEach(g), { once: !0 }), r.append(o, s, c, l, u, d), _(), r;
}
//#endregion
//#region src/ui/panels/TablePanel.js
function yf({ labels: e, operations: t, onInsert: n, onOperation: r, onClose: i }) {
	let a = document.createElement("form");
	if (a.className = "roundeditor__panel-form", a.innerHTML = `
        <label class="roundeditor__field">
            <span>${e.rows}</span>
            <input type="number" name="rows" min="1" max="20" value="3" inputmode="numeric">
        </label>
        <span aria-hidden="true">×</span>
        <label class="roundeditor__field">
            <span>${e.columns}</span>
            <input type="number" name="columns" min="1" max="10" value="3" inputmode="numeric">
        </label>
        <div class="roundeditor__panel-actions">
            <button type="button" class="roundeditor__button roundeditor__button--text" data-action="cancel">${e.cancel}</button>
            <button type="submit" class="roundeditor__button roundeditor__button--primary">${e.insert}</button>
        </div>
    `, a.addEventListener("submit", (e) => {
		e.preventDefault(), n(Math.min(20, Math.max(1, Number(a.elements.namedItem("rows").value) || 1)), Math.min(10, Math.max(1, Number(a.elements.namedItem("columns").value) || 1)));
	}), a.querySelector("[data-action=\"cancel\"]").addEventListener("click", i), t.length) {
		let n = document.createElement("div");
		n.className = "roundeditor__table-actions";
		for (let i of t) {
			let t = document.createElement("button");
			t.type = "button", t.className = "roundeditor__button", t.textContent = e[i.name], t.disabled = !i.enabled, t.addEventListener("click", () => r(i.command)), n.appendChild(t);
		}
		a.prepend(n);
	}
	return queueMicrotask(() => a.elements.namedItem("rows").focus()), a;
}
//#endregion
//#region src/ui/Toolbar.js
var bf = {
	toolbar: "Editor toolbar",
	more: "More",
	close: "Close",
	bold: "Bold",
	italic: "Italic",
	underline: "Underline",
	strike: "Strikethrough",
	fontSize: "Font size",
	lineHeight: "Line height",
	fontFamily: "Font family",
	textColor: "Text color",
	backgroundColor: "Background color",
	clearFormatting: "Clear formatting",
	image: "Image",
	video: "Video (available in Phase 4)",
	link: "Link",
	table: "Table",
	specialCharacters: "Special characters",
	paragraph: "Paragraph tools",
	alignLeft: "Align left",
	alignCenter: "Align center",
	alignRight: "Align right",
	alignJustify: "Justify",
	orderedList: "Numbered list",
	bulletList: "Bulleted list",
	outdent: "Outdent",
	indent: "Indent",
	quote: "Block quote",
	horizontalRule: "Horizontal rule",
	sticker: "Sticker (available in Phase 5)",
	undo: "Undo",
	redo: "Redo",
	selectAll: "Select all",
	source: "Source editing (available in Phase 6)",
	fullscreen: "Fullscreen (available in Phase 6)",
	help: "Keyboard shortcuts",
	normal: "Normal",
	code: "Code",
	reset: "Reset",
	custom: "Custom",
	apply: "Apply",
	remove: "Remove",
	cancel: "Cancel",
	insert: "Insert",
	url: "URL",
	newWindow: "Open in a new window",
	invalidUrl: "Enter a safe URL.",
	rows: "Rows",
	columns: "Columns",
	characters: "Characters",
	helpText: "Ctrl/Cmd+B Bold · Ctrl/Cmd+I Italic · Ctrl/Cmd+U Underline · Ctrl/Cmd+Z Undo",
	characterCount: "Characters",
	futureFeature: "This feature will be added in a later phase.",
	addRowBefore: "Add row above",
	addRowAfter: "Add row below",
	deleteRow: "Delete row",
	addColumnBefore: "Add column left",
	addColumnAfter: "Add column right",
	deleteColumn: "Delete column",
	mergeCells: "Merge cells",
	splitCell: "Split cell",
	deleteTable: "Delete table",
	imageExifPolicy: "Use the site EXIF policy",
	imageFilenamePolicy: "Use the site filename policy",
	imageDropzone: "Choose images or drop them here",
	imageOnly: "Please select image files only.",
	imageAlign: "Alignment",
	imageDelete: "Delete image",
	imageSize: "Image size",
	imageLink: "Image link",
	imageAlt: "Alternative text",
	imageWidth: "Width",
	imageHeight: "Height"
}, xf = {
	bold: "<strong>B</strong>",
	italic: "<em>I</em>",
	underline: "<u>U</u>",
	strike: "<s>S</s>",
	fontSize: "↕",
	lineHeight: "≡",
	textColor: "A",
	backgroundColor: "▣",
	clearFormatting: "Tx",
	fontFamily: "F",
	image: "▧",
	video: "▶",
	link: "🔗",
	table: "▦",
	specialCharacters: "Ω",
	paragraph: "¶",
	alignLeft: "≡",
	alignCenter: "≡",
	alignRight: "≡",
	alignJustify: "☰",
	orderedList: "1.",
	bulletList: "•",
	outdent: "⇤",
	indent: "⇥",
	quote: "❝",
	horizontalRule: "―",
	sticker: "☺",
	undo: "↶",
	redo: "↷",
	selectAll: "▣",
	source: "&lt;/&gt;",
	fullscreen: "⛶",
	help: "?",
	more: "⋯"
};
function $(e, t, n = {}) {
	let r = document.createElement("button");
	return r.type = "button", r.className = `roundeditor__tool${n.className ? ` ${n.className}` : ""}`, r.dataset.command = e, r.title = t[e] || e, r.setAttribute("aria-label", t[e] || e), r.innerHTML = n.icon || xf[e] || e, n.disabled && (r.disabled = !0, r.setAttribute("aria-disabled", "true")), r;
}
function Sf(e, t, n = !1) {
	let r = document.createElement("button");
	return r.type = "button", r.className = "roundeditor__choice", r.dataset.value = t, r.textContent = e, n && r.setAttribute("aria-current", "true"), r;
}
var Cf = class {
	constructor(e) {
		this.bridge = e, this.labels = {
			...bf,
			...e.config.labels || {}
		}, this.activeMore = null, this.panelName = null, this.element = document.createElement("div"), this.element.className = "roundeditor__toolbar", this.element.setAttribute("role", "toolbar"), this.element.setAttribute("aria-label", this.labels.toolbar), this.primaryRow = document.createElement("div"), this.primaryRow.className = "roundeditor__toolbar-primary", this.moreRow = document.createElement("div"), this.moreRow.className = "roundeditor__toolbar-more", this.moreRow.hidden = !0, this.panel = document.createElement("div"), this.panel.className = "roundeditor__panel", this.panel.hidden = !0, this.footer = document.createElement("div"), this.footer.className = "roundeditor__footer", this.counter = document.createElement("span"), this.counter.className = "roundeditor__counter", this.counter.setAttribute("aria-live", "polite"), this.footer.appendChild(this.counter), this.element.append(this.primaryRow, this.moreRow), e.wrapper.insertBefore(this.element, e.wrapper.querySelector(".roundeditor__surface")), e.wrapper.insertBefore(this.panel, e.wrapper.querySelector(".roundeditor__surface")), e.wrapper.appendChild(this.footer), e.config.hideToolbar && (this.element.hidden = !0), this.build();
	}
	build() {
		let e = this.addGroup("text");
		[
			"bold",
			"italic",
			"underline",
			"strike"
		].forEach((t) => e.appendChild($(t, this.labels))), [
			"fontSize",
			"lineHeight",
			"textColor",
			"backgroundColor"
		].forEach((t) => e.appendChild($(t, this.labels))), e.appendChild(this.moreButton("text"));
		let t = this.addGroup("rich");
		t.append($("image", this.labels, { disabled: !this.bridge.config.allowUpload }), $("video", this.labels, { disabled: !0 })), t.appendChild($("link", this.labels)), t.appendChild(this.moreButton("rich")), this.addGroup("paragraph").appendChild(this.moreButton("paragraph", "paragraph")), this.addGroup("sticker").appendChild($("sticker", this.labels, { disabled: !0 }));
		let n = document.createElement("span");
		n.className = "roundeditor__toolbar-spacer", this.primaryRow.appendChild(n);
		let r = this.addGroup("right");
		[
			"undo",
			"redo",
			"selectAll"
		].forEach((e) => r.appendChild($(e, this.labels))), r.appendChild(this.moreButton("right")), this.element.addEventListener("mousedown", (e) => {
			e.target.closest("button") && !e.target.closest(".roundeditor__toolbar-more") && e.preventDefault();
		}), this.element.addEventListener("click", (e) => {
			let t = e.target.closest("[data-command]");
			t && !t.disabled && this.execute(t.dataset.command);
		});
	}
	addGroup(e) {
		let t = document.createElement("div");
		return t.className = `roundeditor__tool-group roundeditor__tool-group--${e}`, t.dataset.group = e, this.primaryRow.appendChild(t), t;
	}
	moreButton(e, t = "more") {
		let n = $("more", this.labels, { icon: xf[t] });
		return n.dataset.moreGroup = e, n.addEventListener("click", (t) => {
			t.stopPropagation(), this.toggleMore(e, n);
		}), n;
	}
	toggleMore(e, t) {
		if (this.activeMore === e) {
			this.closeMore();
			return;
		}
		this.closePanel(), this.activeMore = e, this.moreRow.replaceChildren(), this.moreRow.hidden = !1, this.moreRow.dataset.group = e;
		for (let t of this.moreTools(e)) this.moreRow.appendChild(t);
		for (let e of this.element.querySelectorAll("[data-more-group]")) e.setAttribute("aria-expanded", String(e === t));
	}
	moreTools(e) {
		return ({
			text: ["fontFamily", "clearFormatting"],
			rich: ["table", "specialCharacters"],
			paragraph: [
				"format",
				"alignLeft",
				"alignCenter",
				"alignRight",
				"alignJustify",
				"orderedList",
				"bulletList",
				"outdent",
				"indent",
				"quote",
				"horizontalRule"
			],
			right: [
				"source",
				"fullscreen",
				"help"
			]
		}[e] || []).map((e) => e === "format" ? $("format", { format: this.labels.normal }, { icon: "P" }) : $(e, this.labels, { disabled: ["source", "fullscreen"].includes(e) }));
	}
	closeMore() {
		this.activeMore = null, this.moreRow.hidden = !0, this.moreRow.replaceChildren();
		for (let e of this.element.querySelectorAll("[data-more-group]")) e.setAttribute("aria-expanded", "false");
	}
	openPanel(e, t, n) {
		if (this.panelName === e) {
			this.closePanel();
			return;
		}
		this.panelName = e;
		let r = document.createElement("div");
		r.className = "roundeditor__panel-heading";
		let i = document.createElement("strong");
		i.textContent = t;
		let a = $("close", this.labels, { icon: "×" });
		a.addEventListener("click", () => this.closePanel()), r.append(i, a), this.panel.replaceChildren(r, n), this.panel.hidden = !1;
	}
	closePanel() {
		this.panel.querySelector(".roundeditor__image-panel")?.dispatchEvent(new window.Event("roundeditor:close")), this.panelName = null, this.panel.hidden = !0, this.panel.replaceChildren();
	}
	choices(e, t, n, r) {
		let i = document.createElement("div");
		i.className = "roundeditor__choices";
		for (let e of t) {
			let t = Sf(n(e), String(e));
			t.addEventListener("click", () => {
				r(e), this.closePanel();
			}), i.appendChild(t);
		}
		return i;
	}
	colorPanel(e, t) {
		let n = document.createElement("div");
		n.className = "roundeditor__palette";
		let r = Sf(this.labels.reset, "");
		r.classList.add("roundeditor__swatch", "roundeditor__swatch--reset"), r.addEventListener("click", () => {
			Q(this.bridge.view, Qd(this.bridge.view.state.schema.marks[e], null)), this.closePanel();
		}), n.appendChild(r);
		for (let t of qd) {
			let r = Sf(t, t);
			r.classList.add("roundeditor__swatch"), r.style.setProperty("--roundeditor-swatch", t), r.setAttribute("aria-label", t), r.addEventListener("click", () => {
				Q(this.bridge.view, Qd(this.bridge.view.state.schema.marks[e], t)), this.closePanel();
			}), n.appendChild(r);
		}
		this.openPanel(e, t, n);
	}
	execute(e) {
		let t = this.bridge.view, { schema: n } = t.state, r = {
			bold: Zd(n.marks.strong),
			italic: Zd(n.marks.em),
			underline: Zd(n.marks.underline),
			strike: Zd(n.marks.strike),
			clearFormatting: of,
			alignLeft: ef({ align: null }),
			alignCenter: ef({ align: "center" }),
			alignRight: ef({ align: "right" }),
			alignJustify: ef({ align: "justify" }),
			orderedList: af(n.nodes.orderedList, n.nodes.listItem),
			bulletList: af(n.nodes.bulletList, n.nodes.listItem),
			outdent: tf(-1),
			indent: tf(1),
			quote: rf(n),
			horizontalRule: uf,
			undo: Sc,
			redo: Cc,
			selectAll: ff
		};
		if (r[e]) {
			Q(t, r[e]);
			return;
		}
		if (e === "image") {
			let t = vf({
				bridge: this.bridge,
				labels: this.labels,
				onClose: () => this.closePanel()
			});
			this.openPanel(e, this.labels.image, t);
		} else if (e === "fontSize") {
			let r = this.choices(e, Gd, (e) => `${e}px`, (e) => Q(t, Qd(n.marks.fontSize, `${e}px`))), i = Sf(this.labels.custom, "custom");
			i.addEventListener("click", () => this.customFontSize()), r.appendChild(i), this.openPanel(e, this.labels.fontSize, r);
		} else if (e === "fontFamily") {
			let r = [{
				label: this.labels.reset,
				value: null
			}, ...Array.isArray(this.bridge.config.fontFamilies) ? this.bridge.config.fontFamilies : []], i = this.choices(e, r, (e) => e.label, (e) => Q(t, Qd(n.marks.fontFamily, e.value)));
			for (let [e, t] of r.entries()) t.value && (i.children[e].style.fontFamily = t.value);
			this.openPanel(e, this.labels.fontFamily, i);
		} else if (e === "lineHeight") {
			let n = this.choices(e, Kd, (e) => e === "1" ? this.labels.reset : e, (e) => Q(t, ef({ lineHeight: e === "1" ? null : e })));
			this.openPanel(e, this.labels.lineHeight, n);
		} else if (e === "textColor") this.colorPanel("fontColor", this.labels.textColor);
		else if (e === "backgroundColor") this.colorPanel("bgColor", this.labels.backgroundColor);
		else if (e === "format") this.formatPanel();
		else if (e === "link") this.linkPanel();
		else if (e === "table") this.tablePanel();
		else if (e === "specialCharacters") this.characterPanel();
		else if (e === "help") {
			let t = document.createElement("p");
			t.className = "roundeditor__help", t.textContent = this.labels.helpText, this.openPanel(e, this.labels.help, t);
		}
	}
	customFontSize() {
		let e = document.createElement("form");
		e.className = "roundeditor__panel-form", e.innerHTML = `<label class="roundeditor__field"><span>${this.labels.fontSize}</span><input type="number" min="1" max="300" value="15" inputmode="numeric"></label><button class="roundeditor__button roundeditor__button--primary" type="submit">${this.labels.apply}</button>`, e.addEventListener("submit", (t) => {
			t.preventDefault();
			let n = Math.min(300, Math.max(1, Number(e.querySelector("input").value) || 15));
			Q(this.bridge.view, Qd(this.bridge.view.state.schema.marks.fontSize, `${n}px`)), this.closePanel();
		}), this.openPanel("customFontSize", this.labels.fontSize, e);
	}
	formatPanel() {
		let e = [
			["normal", this.labels.normal],
			["h1", "H1"],
			["h2", "H2"],
			["h3", "H3"],
			["h4", "H4"],
			["code", this.labels.code]
		], t = this.choices("format", e, (e) => e[1], (e) => Q(this.bridge.view, nf(e[0])));
		this.openPanel("format", this.labels.paragraph, t);
	}
	linkPanel() {
		let e = mf({
			labels: this.labels,
			onApply: (e, t) => {
				Q(this.bridge.view, sf(e, t)), this.closePanel();
			},
			onRemove: () => {
				Q(this.bridge.view, cf), this.closePanel();
			},
			onClose: () => this.closePanel()
		});
		this.openPanel("link", this.labels.link, e);
	}
	tablePanel() {
		let e = [
			["addRowBefore", ll],
			["addRowAfter", ul],
			["deleteRow", fl],
			["addColumnBefore", rl],
			["addColumnAfter", il],
			["deleteColumn", ol],
			["mergeCells", hl],
			["splitCell", gl],
			["deleteTable", xl]
		], t = Lc(this.bridge.view.state) ? e.map(([e, t]) => ({
			name: e,
			command: t,
			enabled: t(this.bridge.view.state)
		})) : [], n = yf({
			labels: this.labels,
			operations: t,
			onInsert: (e, t) => {
				Q(this.bridge.view, lf(e, t)), this.closePanel();
			},
			onOperation: (e) => {
				Q(this.bridge.view, e), this.closePanel();
			},
			onClose: () => this.closePanel()
		});
		this.openPanel("table", this.labels.table, n);
	}
	characterPanel() {
		let e = this.choices("characters", [..."©®™…—–·•※★☆♥♡✓→←↑↓±×÷≠≤≥∞℃₩€¥£§¶「」『』【】"], (e) => e, (e) => Q(this.bridge.view, df(e)));
		this.openPanel("characters", this.labels.specialCharacters, e);
	}
	refresh(e) {
		for (let [t, n] of Object.entries({
			bold: "strong",
			italic: "em",
			underline: "underline",
			strike: "strike"
		})) {
			let r = this.element.querySelector(`[data-command="${t}"]`), i = Jd(e, e.schema.marks[n]);
			r?.classList.toggle("roundeditor__tool--active", i), r?.setAttribute("aria-pressed", String(i));
		}
		let t = {
			orderedList: e.schema.nodes.orderedList,
			bulletList: e.schema.nodes.bulletList,
			quote: e.schema.nodes.blockquote
		};
		for (let [n, r] of Object.entries(t)) {
			let t = this.element.querySelector(`[data-command="${n}"]`), i = Yd(e, r);
			t?.classList.toggle("roundeditor__tool--active", i), t?.setAttribute("aria-pressed", String(i));
		}
		let n = Xd(e, "align");
		for (let [e, t] of Object.entries({
			alignLeft: null,
			alignCenter: "center",
			alignRight: "right",
			alignJustify: "justify"
		})) {
			let r = this.element.querySelector(`[data-command="${e}"]`), i = n === t;
			r?.classList.toggle("roundeditor__tool--active", i), r?.setAttribute("aria-pressed", String(i));
		}
		let r = this.element.querySelector("[data-command=\"undo\"]"), i = this.element.querySelector("[data-command=\"redo\"]");
		r && (r.disabled = !Sc(e)), i && (i.disabled = !Cc(e)), this.counter.textContent = `${this.labels.characterCount} : ${e.doc.textContent.length}`;
	}
}, wf = Object.create(null);
function Tf(e) {
	let t = Number.parseInt(String(e ?? ""), 10);
	return Number.isFinite(t) && t > 0 ? t : 0;
}
function Ef(e) {
	try {
		return JSON.parse(e.dataset.editorConfig || "{}");
	} catch (e) {
		throw Error(`Invalid roundeditor configuration: ${e.message}`);
	}
}
function Df(e, t) {
	let n = e.elements.namedItem(t);
	return n ? typeof RadioNodeList < "u" && n instanceof RadioNodeList ? n[0] || null : n : null;
}
function Of(e, t, n) {
	let r = Df(e, t);
	return r || (r = document.createElement("input"), r.type = "hidden", r.name = t, e.appendChild(r)), r.value = n, r.setAttribute("value", n), r;
}
function kf() {
	return [
		bc(),
		Nr({
			"Mod-z": Sc,
			"Mod-y": Cc,
			"Mod-Shift-z": Cc,
			"Mod-b": pr(Z.marks.strong),
			"Mod-i": pr(Z.marks.em),
			"Mod-u": pr(Z.marks.underline),
			"Mod-Shift-x": pr(Z.marks.strike)
		}),
		Nr(yr),
		Ul(),
		ru(),
		br(),
		Ys()
	];
}
function Af(e, t) {
	let n = Ld(t);
	return e.view.dispatch(e.view.state.tr.replaceSelection(n)), e.view.focus(), e.sync();
}
function jf(e) {
	return kd({ content: e.view.state.selection.content().content }, Z);
}
function Mf(e) {
	let t = e?.jquery ? e[0] : e, n = [
		t?.dataset?.editorSequence,
		t?.editor_sequence,
		typeof t?.getAttribute == "function" ? t.getAttribute("data-editor-sequence") : null,
		String(t?.id || "").match(/_(\d+)$/)?.[1],
		window.editorPrevSrl
	];
	typeof t?.closest == "function" && n.push(t.closest("[data-editor-sequence]")?.dataset?.editorSequence);
	for (let e of n) {
		let t = wf[Tf(e)];
		if (t) return t;
	}
	return Object.values(wf).find((e) => {
		if (t === e.editable || t === e.wrapper) return !0;
		try {
			return e.wrapper.contains(t);
		} catch {
			return !1;
		}
	}) || null;
}
function Nf(e) {
	return {
		mode: "wysiwyg",
		getData: () => e.sync(),
		setData: (t) => (e.updateDocument(t), e.sync()),
		insertHtml: (t) => Af(e, t),
		getText: () => e.view.state.doc.textBetween(0, e.view.state.doc.content.size, "\n\n"),
		getSelection: () => ({ getSelectedText: () => e.view.state.doc.textBetween(e.view.state.selection.from, e.view.state.selection.to, "\n\n") }),
		focus: () => e.view.focus()
	};
}
function Pf() {
	if (window.RoundEditorGlobalsInstalled) return;
	window.RoundEditorGlobalsInstalled = !0;
	let e = {
		getInstance: window._getCkeInstance,
		getContainer: window._getCkeContainer,
		getFrame: window.editorGetIFrame,
		replaceHtml: window.editorReplaceHTML,
		getContent: window.editorGetContent,
		getText: window.editorGetContentTextarea_xe,
		getSelected: window.editorGetSelectedHtml
	};
	window._getCkeInstance = (t) => {
		let n = wf[Tf(t)];
		return n ? n.compat : e.getInstance?.(t);
	}, window._getCkeContainer = (t) => {
		let n = wf[Tf(t)];
		return n ? window.jQuery ? window.jQuery(n.wrapper) : n.wrapper : e.getContainer?.(t);
	}, window.editorGetIFrame = (t) => {
		let n = wf[Tf(t)];
		return n ? n.editable : e.getFrame?.(t) || null;
	}, window.editorReplaceHTML = (t, n) => {
		let r = Mf(t);
		return r ? r.compat.insertHtml(n, "unfiltered_html") : e.replaceHtml?.(t, n);
	}, window.editorGetContent = (t) => {
		let n = wf[Tf(t)];
		return n ? n.sync() : e.getContent?.(t) || "";
	}, window.editorGetContentTextarea_xe = (t) => {
		let n = wf[Tf(t)];
		return n ? n.compat.getText() : e.getText?.(t) || "";
	}, window.editorGetSelectedHtml = (t) => {
		let n = wf[Tf(t)];
		return n ? jf(n) : e.getSelected?.(t) || "";
	};
}
function Ff(e) {
	let t = {
		"--roundeditor-height": `${e.config.height}px`,
		"--roundeditor-content-font": e.config.contentFont,
		"--roundeditor-content-font-size": e.config.contentFontSize,
		"--roundeditor-content-line-height": e.config.contentLineHeight,
		"--roundeditor-content-word-break": e.config.contentWordBreak,
		"--roundeditor-content-paragraph-spacing": e.config.contentParagraphSpacing
	};
	Object.entries(t).forEach(([t, n]) => e.wrapper.style.setProperty(t, n));
}
function If(e, t) {
	e.classList.add("roundeditor--error");
	let n = e.querySelector(".roundeditor__loading");
	n && n.remove();
	let r = e.querySelector(".roundeditor__surface");
	r && (r.className = "roundeditor__error", r.textContent = `roundeditor could not be initialized.\n${t.message || t}`), console.error("[roundeditor] Initialization failed.", t);
}
function Lf(e) {
	let t = Ef(e), n = Tf(t.editorSequence || e.dataset.editorSequence), r = e.closest("form");
	if (!n || !r) throw Error("The editor sequence or parent form is missing.");
	let i = Df(r, t.contentKeyName);
	if (!i) throw Error(`The Rhymix content field "${t.contentKeyName}" was not found.`);
	let a = {
		wrapper: e,
		form: r,
		config: t,
		sequence: n,
		primaryInput: Df(r, t.primaryKeyName) || { value: "" },
		contentInput: i,
		view: null,
		editable: null,
		compat: null,
		toolbar: null,
		sync() {
			return this.view && (this.contentInput.value = kd(this.view.state.doc, Z)), this.contentInput.value;
		},
		updateDocument(e) {
			let t = Nn.create({
				doc: Id(e),
				plugins: kf()
			});
			this.view.updateState(t);
		}
	}, o = Nn.create({
		doc: Id(i.value),
		plugins: kf()
	});
	a.view = new Ls(e.querySelector(".roundeditor__surface"), {
		state: o,
		attributes: {
			class: "rhymix_content xe_content editable",
			"data-editor-sequence": String(n),
			spellcheck: "false"
		},
		transformPastedHTML: Sd,
		handlePaste: (e, t) => mu(a, t),
		handleDrop: (e, t, n, r) => hu(a, t, r),
		nodeViews: {
			...Du(),
			image: Tu(a)
		},
		dispatchTransaction(e) {
			a.view.updateState(a.view.state.apply(e)), a.sync(), a.toolbar?.refresh(a.view.state);
		}
	}), a.editable = a.view.dom, a.editable.editor_sequence = n, a.editable.setFocus = () => a.view.focus(), a.editable.replaceHTML = (e) => Af(a, e), a.compat = Nf(a), a.toolbar = new Cf(a), a.toolbar.refresh(a.view.state), wf[n] = a, r.setAttribute("editor_sequence", String(n)), Of(r, "use_editor", "Y"), Of(r, "use_html", "Y"), Ff(a), Pf(), window.editorRelKeys = window.editorRelKeys || [], window.editorRelKeys[n] = {
		primary: a.primaryInput,
		content: a.contentInput,
		func: () => a.sync(),
		pasteHTML: (e) => Af(a, e),
		editor: { getFrame: () => a.editable }
	}, window.editorMode = window.editorMode || [], window.editorMode[n] = null, r.addEventListener("submit", () => a.sync(), !0), a.sync(), e.querySelector(".roundeditor__loading")?.remove(), e.classList.add("roundeditor--ready"), t.focus && a.view.focus();
}
function Rf() {
	document.querySelectorAll(".roundeditor:not([data-roundeditor-started])").forEach((e) => {
		e.setAttribute("data-roundeditor-started", "true");
		try {
			Lf(e);
		} catch (t) {
			If(e, t);
		}
	});
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", Rf, { once: !0 }) : Rf(), window.addEventListener("pageshow", Rf);
//#endregion
