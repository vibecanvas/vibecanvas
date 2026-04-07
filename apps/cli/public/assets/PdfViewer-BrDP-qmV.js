import { c as Ot, t as Zs, d as ti, a as is, o as ei, b as si, i as bt, e as Tt, f as ns, g as ii, m as ni, h as ri, j as ai, S as oe, k as oi, u as rs, l as Ft, n as li, __tla as __tla_0 } from "./index-Bd9yMaDE.js";
let _r;
let __tla = Promise.all([
    (()=>{
        try {
            return __tla_0;
        } catch  {}
    })()
]).then(async ()=>{
    var Jt = {};
    Jt.d = (c, t)=>{
        for(var e in t)Jt.o(t, e) && !Jt.o(c, e) && Object.defineProperty(c, e, {
            enumerable: !0,
            get: t[e]
        });
    };
    Jt.o = (c, t)=>Object.prototype.hasOwnProperty.call(c, t);
    var L = globalThis.pdfjsLib = {};
    Jt.d(L, {
        AbortException: ()=>Lt,
        AnnotationEditorLayer: ()=>Rt,
        AnnotationEditorParamsType: ()=>H,
        AnnotationEditorType: ()=>F,
        AnnotationEditorUIManager: ()=>Dt,
        AnnotationLayer: ()=>nr,
        AnnotationMode: ()=>kt,
        ColorPicker: ()=>yt,
        DOMSVGFactory: ()=>Je,
        DrawLayer: ()=>ht,
        FeatureTest: ()=>dt,
        GlobalWorkerOptions: ()=>te,
        ImageKind: ()=>ue,
        InvalidPDFException: ()=>De,
        MissingPDFException: ()=>ee,
        OPS: ()=>wt,
        OutputScale: ()=>Fe,
        PDFDataRangeTransport: ()=>js,
        PDFDateString: ()=>Ts,
        PDFWorker: ()=>nt,
        PasswordResponses: ()=>ui,
        PermissionFlag: ()=>di,
        PixelsPerInch: ()=>Vt,
        RenderingCancelledException: ()=>je,
        TextLayer: ()=>ct,
        TouchManager: ()=>we,
        UnexpectedResponseException: ()=>fe,
        Util: ()=>T,
        VerbosityLevel: ()=>ge,
        XfaLayer: ()=>Vs,
        build: ()=>Bn,
        createValidAbsoluteUrl: ()=>mi,
        fetchData: ()=>ye,
        getDocument: ()=>Rn,
        getFilenameFromUrl: ()=>xi,
        getPdfFilenameFromUrl: ()=>Ci,
        getXfaPageViewport: ()=>Ti,
        isDataScheme: ()=>ve,
        isPdfFile: ()=>Ue,
        noContextMenu: ()=>_t,
        normalizeUnicode: ()=>_i,
        setLayerDimensions: ()=>Ht,
        shadow: ()=>O,
        stopEvent: ()=>mt,
        version: ()=>On
    });
    const lt = typeof process == "object" && process + "" == "[object process]" && !process.versions.nw && !(process.versions.electron && process.type && process.type !== "browser"), xs = [
        1,
        0,
        0,
        1,
        0,
        0
    ], Le = [
        .001,
        0,
        0,
        .001,
        0,
        0
    ], hi = 1e7, Ce = 1.35, gt = {
        ANY: 1,
        DISPLAY: 2,
        PRINT: 4,
        ANNOTATIONS_FORMS: 16,
        ANNOTATIONS_STORAGE: 32,
        ANNOTATIONS_DISABLE: 64,
        IS_EDITING: 128,
        OPLIST: 256
    }, kt = {
        DISABLE: 0,
        ENABLE: 1,
        ENABLE_FORMS: 2,
        ENABLE_STORAGE: 3
    }, ci = "pdfjs_internal_editor_", F = {
        DISABLE: -1,
        NONE: 0,
        FREETEXT: 3,
        HIGHLIGHT: 9,
        STAMP: 13,
        INK: 15
    }, H = {
        RESIZE: 1,
        CREATE: 2,
        FREETEXT_SIZE: 11,
        FREETEXT_COLOR: 12,
        FREETEXT_OPACITY: 13,
        INK_COLOR: 21,
        INK_THICKNESS: 22,
        INK_OPACITY: 23,
        HIGHLIGHT_COLOR: 31,
        HIGHLIGHT_DEFAULT_COLOR: 32,
        HIGHLIGHT_THICKNESS: 33,
        HIGHLIGHT_FREE: 34,
        HIGHLIGHT_SHOW_ALL: 35,
        DRAW_STEP: 41
    }, di = {
        PRINT: 4,
        MODIFY_CONTENTS: 8,
        COPY: 16,
        MODIFY_ANNOTATIONS: 32,
        FILL_INTERACTIVE_FORMS: 256,
        COPY_FOR_ACCESSIBILITY: 512,
        ASSEMBLE: 1024,
        PRINT_HIGH_QUALITY: 2048
    }, at = {
        FILL: 0,
        STROKE: 1,
        FILL_STROKE: 2,
        INVISIBLE: 3,
        FILL_STROKE_MASK: 3,
        ADD_TO_PATH_FLAG: 4
    }, ue = {
        GRAYSCALE_1BPP: 1,
        RGB_24BPP: 2,
        RGBA_32BPP: 3
    }, st = {
        TEXT: 1,
        LINK: 2,
        FREETEXT: 3,
        LINE: 4,
        SQUARE: 5,
        CIRCLE: 6,
        POLYGON: 7,
        POLYLINE: 8,
        HIGHLIGHT: 9,
        UNDERLINE: 10,
        SQUIGGLY: 11,
        STRIKEOUT: 12,
        STAMP: 13,
        CARET: 14,
        INK: 15,
        POPUP: 16,
        FILEATTACHMENT: 17,
        WIDGET: 20
    }, Wt = {
        SOLID: 1,
        DASHED: 2,
        BEVELED: 3,
        INSET: 4,
        UNDERLINE: 5
    }, ge = {
        ERRORS: 0,
        WARNINGS: 1,
        INFOS: 5
    }, wt = {
        dependency: 1,
        setLineWidth: 2,
        setLineCap: 3,
        setLineJoin: 4,
        setMiterLimit: 5,
        setDash: 6,
        setRenderingIntent: 7,
        setFlatness: 8,
        setGState: 9,
        save: 10,
        restore: 11,
        transform: 12,
        moveTo: 13,
        lineTo: 14,
        curveTo: 15,
        curveTo2: 16,
        curveTo3: 17,
        closePath: 18,
        rectangle: 19,
        stroke: 20,
        closeStroke: 21,
        fill: 22,
        eoFill: 23,
        fillStroke: 24,
        eoFillStroke: 25,
        closeFillStroke: 26,
        closeEOFillStroke: 27,
        endPath: 28,
        clip: 29,
        eoClip: 30,
        beginText: 31,
        endText: 32,
        setCharSpacing: 33,
        setWordSpacing: 34,
        setHScale: 35,
        setLeading: 36,
        setFont: 37,
        setTextRenderingMode: 38,
        setTextRise: 39,
        moveText: 40,
        setLeadingMoveText: 41,
        setTextMatrix: 42,
        nextLine: 43,
        showText: 44,
        showSpacedText: 45,
        nextLineShowText: 46,
        nextLineSetSpacingShowText: 47,
        setCharWidth: 48,
        setCharWidthAndBounds: 49,
        setStrokeColorSpace: 50,
        setFillColorSpace: 51,
        setStrokeColor: 52,
        setStrokeColorN: 53,
        setFillColor: 54,
        setFillColorN: 55,
        setStrokeGray: 56,
        setFillGray: 57,
        setStrokeRGBColor: 58,
        setFillRGBColor: 59,
        setStrokeCMYKColor: 60,
        setFillCMYKColor: 61,
        shadingFill: 62,
        beginInlineImage: 63,
        beginImageData: 64,
        endInlineImage: 65,
        paintXObject: 66,
        markPoint: 67,
        markPointProps: 68,
        beginMarkedContent: 69,
        beginMarkedContentProps: 70,
        endMarkedContent: 71,
        beginCompat: 72,
        endCompat: 73,
        paintFormXObjectBegin: 74,
        paintFormXObjectEnd: 75,
        beginGroup: 76,
        endGroup: 77,
        beginAnnotation: 80,
        endAnnotation: 81,
        paintImageMaskXObject: 83,
        paintImageMaskXObjectGroup: 84,
        paintImageXObject: 85,
        paintInlineImageXObject: 86,
        paintInlineImageXObjectGroup: 87,
        paintImageXObjectRepeat: 88,
        paintImageMaskXObjectRepeat: 89,
        paintSolidColorImageMask: 90,
        constructPath: 91,
        setStrokeTransparent: 92,
        setFillTransparent: 93
    }, ui = {
        NEED_PASSWORD: 1,
        INCORRECT_PASSWORD: 2
    };
    let me = ge.WARNINGS;
    function fi(c) {
        Number.isInteger(c) && (me = c);
    }
    function pi() {
        return me;
    }
    function be(c) {
        me >= ge.INFOS && console.log(`Info: ${c}`);
    }
    function N(c) {
        me >= ge.WARNINGS && console.log(`Warning: ${c}`);
    }
    function V(c) {
        throw new Error(c);
    }
    function tt(c, t) {
        c || V(t);
    }
    function gi(c) {
        switch(c?.protocol){
            case "http:":
            case "https:":
            case "ftp:":
            case "mailto:":
            case "tel:":
                return !0;
            default:
                return !1;
        }
    }
    function mi(c, t = null, e = null) {
        if (!c) return null;
        try {
            if (e && typeof c == "string" && (e.addDefaultProtocol && c.startsWith("www.") && c.match(/\./g)?.length >= 2 && (c = `http://${c}`), e.tryConvertEncoding)) try {
                c = wi(c);
            } catch  {}
            const s = t ? new URL(c, t) : new URL(c);
            if (gi(s)) return s;
        } catch  {}
        return null;
    }
    function O(c, t, e, s = !1) {
        return Object.defineProperty(c, t, {
            value: e,
            enumerable: !s,
            configurable: !0,
            writable: !1
        }), e;
    }
    const Nt = (function() {
        function t(e, s) {
            this.message = e, this.name = s;
        }
        return t.prototype = new Error, t.constructor = t, t;
    })();
    class as extends Nt {
        constructor(t, e){
            super(t, "PasswordException"), this.code = e;
        }
    }
    class Te extends Nt {
        constructor(t, e){
            super(t, "UnknownErrorException"), this.details = e;
        }
    }
    class De extends Nt {
        constructor(t){
            super(t, "InvalidPDFException");
        }
    }
    class ee extends Nt {
        constructor(t){
            super(t, "MissingPDFException");
        }
    }
    class fe extends Nt {
        constructor(t, e){
            super(t, "UnexpectedResponseException"), this.status = e;
        }
    }
    class bi extends Nt {
        constructor(t){
            super(t, "FormatError");
        }
    }
    class Lt extends Nt {
        constructor(t){
            super(t, "AbortException");
        }
    }
    function Cs(c) {
        (typeof c != "object" || c?.length === void 0) && V("Invalid argument for bytesToString");
        const t = c.length, e = 8192;
        if (t < e) return String.fromCharCode.apply(null, c);
        const s = [];
        for(let i = 0; i < t; i += e){
            const n = Math.min(i + e, t), r = c.subarray(i, n);
            s.push(String.fromCharCode.apply(null, r));
        }
        return s.join("");
    }
    function Ae(c) {
        typeof c != "string" && V("Invalid argument for stringToBytes");
        const t = c.length, e = new Uint8Array(t);
        for(let s = 0; s < t; ++s)e[s] = c.charCodeAt(s) & 255;
        return e;
    }
    function Ai(c) {
        return String.fromCharCode(c >> 24 & 255, c >> 16 & 255, c >> 8 & 255, c & 255);
    }
    function ze(c) {
        const t = Object.create(null);
        for (const [e, s] of c)t[e] = s;
        return t;
    }
    function yi() {
        const c = new Uint8Array(4);
        return c[0] = 1, new Uint32Array(c.buffer, 0, 1)[0] === 1;
    }
    function vi() {
        try {
            return new Function(""), !0;
        } catch  {
            return !1;
        }
    }
    class dt {
        static get isLittleEndian() {
            return O(this, "isLittleEndian", yi());
        }
        static get isEvalSupported() {
            return O(this, "isEvalSupported", vi());
        }
        static get isOffscreenCanvasSupported() {
            return O(this, "isOffscreenCanvasSupported", typeof OffscreenCanvas < "u");
        }
        static get isImageDecoderSupported() {
            return O(this, "isImageDecoderSupported", typeof ImageDecoder < "u");
        }
        static get platform() {
            return typeof navigator < "u" && typeof navigator?.platform == "string" ? O(this, "platform", {
                isMac: navigator.platform.includes("Mac"),
                isWindows: navigator.platform.includes("Win"),
                isFirefox: typeof navigator?.userAgent == "string" && navigator.userAgent.includes("Firefox")
            }) : O(this, "platform", {
                isMac: !1,
                isWindows: !1,
                isFirefox: !1
            });
        }
        static get isCSSRoundSupported() {
            return O(this, "isCSSRoundSupported", globalThis.CSS?.supports?.("width: round(1.5px, 1px)"));
        }
    }
    const Pe = Array.from(Array(256).keys(), (c)=>c.toString(16).padStart(2, "0"));
    class T {
        static makeHexColor(t, e, s) {
            return `#${Pe[t]}${Pe[e]}${Pe[s]}`;
        }
        static scaleMinMax(t, e) {
            let s;
            t[0] ? (t[0] < 0 && (s = e[0], e[0] = e[2], e[2] = s), e[0] *= t[0], e[2] *= t[0], t[3] < 0 && (s = e[1], e[1] = e[3], e[3] = s), e[1] *= t[3], e[3] *= t[3]) : (s = e[0], e[0] = e[1], e[1] = s, s = e[2], e[2] = e[3], e[3] = s, t[1] < 0 && (s = e[1], e[1] = e[3], e[3] = s), e[1] *= t[1], e[3] *= t[1], t[2] < 0 && (s = e[0], e[0] = e[2], e[2] = s), e[0] *= t[2], e[2] *= t[2]), e[0] += t[4], e[1] += t[5], e[2] += t[4], e[3] += t[5];
        }
        static transform(t, e) {
            return [
                t[0] * e[0] + t[2] * e[1],
                t[1] * e[0] + t[3] * e[1],
                t[0] * e[2] + t[2] * e[3],
                t[1] * e[2] + t[3] * e[3],
                t[0] * e[4] + t[2] * e[5] + t[4],
                t[1] * e[4] + t[3] * e[5] + t[5]
            ];
        }
        static applyTransform(t, e) {
            const s = t[0] * e[0] + t[1] * e[2] + e[4], i = t[0] * e[1] + t[1] * e[3] + e[5];
            return [
                s,
                i
            ];
        }
        static applyInverseTransform(t, e) {
            const s = e[0] * e[3] - e[1] * e[2], i = (t[0] * e[3] - t[1] * e[2] + e[2] * e[5] - e[4] * e[3]) / s, n = (-t[0] * e[1] + t[1] * e[0] + e[4] * e[1] - e[5] * e[0]) / s;
            return [
                i,
                n
            ];
        }
        static getAxialAlignedBoundingBox(t, e) {
            const s = this.applyTransform(t, e), i = this.applyTransform(t.slice(2, 4), e), n = this.applyTransform([
                t[0],
                t[3]
            ], e), r = this.applyTransform([
                t[2],
                t[1]
            ], e);
            return [
                Math.min(s[0], i[0], n[0], r[0]),
                Math.min(s[1], i[1], n[1], r[1]),
                Math.max(s[0], i[0], n[0], r[0]),
                Math.max(s[1], i[1], n[1], r[1])
            ];
        }
        static inverseTransform(t) {
            const e = t[0] * t[3] - t[1] * t[2];
            return [
                t[3] / e,
                -t[1] / e,
                -t[2] / e,
                t[0] / e,
                (t[2] * t[5] - t[4] * t[3]) / e,
                (t[4] * t[1] - t[5] * t[0]) / e
            ];
        }
        static singularValueDecompose2dScale(t) {
            const e = [
                t[0],
                t[2],
                t[1],
                t[3]
            ], s = t[0] * e[0] + t[1] * e[2], i = t[0] * e[1] + t[1] * e[3], n = t[2] * e[0] + t[3] * e[2], r = t[2] * e[1] + t[3] * e[3], a = (s + r) / 2, o = Math.sqrt((s + r) ** 2 - 4 * (s * r - n * i)) / 2, l = a + o || 1, h = a - o || 1;
            return [
                Math.sqrt(l),
                Math.sqrt(h)
            ];
        }
        static normalizeRect(t) {
            const e = t.slice(0);
            return t[0] > t[2] && (e[0] = t[2], e[2] = t[0]), t[1] > t[3] && (e[1] = t[3], e[3] = t[1]), e;
        }
        static intersect(t, e) {
            const s = Math.max(Math.min(t[0], t[2]), Math.min(e[0], e[2])), i = Math.min(Math.max(t[0], t[2]), Math.max(e[0], e[2]));
            if (s > i) return null;
            const n = Math.max(Math.min(t[1], t[3]), Math.min(e[1], e[3])), r = Math.min(Math.max(t[1], t[3]), Math.max(e[1], e[3]));
            return n > r ? null : [
                s,
                n,
                i,
                r
            ];
        }
        static #t(t, e, s, i, n, r, a, o, l, h) {
            if (l <= 0 || l >= 1) return;
            const d = 1 - l, u = l * l, f = u * l, p = d * (d * (d * t + 3 * l * e) + 3 * u * s) + f * i, g = d * (d * (d * n + 3 * l * r) + 3 * u * a) + f * o;
            h[0] = Math.min(h[0], p), h[1] = Math.min(h[1], g), h[2] = Math.max(h[2], p), h[3] = Math.max(h[3], g);
        }
        static #e(t, e, s, i, n, r, a, o, l, h, d, u) {
            if (Math.abs(l) < 1e-12) {
                Math.abs(h) >= 1e-12 && this.#t(t, e, s, i, n, r, a, o, -d / h, u);
                return;
            }
            const f = h ** 2 - 4 * d * l;
            if (f < 0) return;
            const p = Math.sqrt(f), g = 2 * l;
            this.#t(t, e, s, i, n, r, a, o, (-h + p) / g, u), this.#t(t, e, s, i, n, r, a, o, (-h - p) / g, u);
        }
        static bezierBoundingBox(t, e, s, i, n, r, a, o, l) {
            return l ? (l[0] = Math.min(l[0], t, a), l[1] = Math.min(l[1], e, o), l[2] = Math.max(l[2], t, a), l[3] = Math.max(l[3], e, o)) : l = [
                Math.min(t, a),
                Math.min(e, o),
                Math.max(t, a),
                Math.max(e, o)
            ], this.#e(t, s, n, a, e, i, r, o, 3 * (-t + 3 * (s - n) + a), 6 * (t - 2 * s + n), 3 * (s - t), l), this.#e(t, s, n, a, e, i, r, o, 3 * (-e + 3 * (i - r) + o), 6 * (e - 2 * i + r), 3 * (i - e), l), l;
        }
    }
    function wi(c) {
        return decodeURIComponent(escape(c));
    }
    let Re = null, os = null;
    function _i(c) {
        return Re || (Re = /([\u00a0\u00b5\u037e\u0eb3\u2000-\u200a\u202f\u2126\ufb00-\ufb04\ufb06\ufb20-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufba1\ufba4-\ufba9\ufbae-\ufbb1\ufbd3-\ufbdc\ufbde-\ufbe7\ufbea-\ufbf8\ufbfc-\ufbfd\ufc00-\ufc5d\ufc64-\ufcf1\ufcf5-\ufd3d\ufd88\ufdf4\ufdfa-\ufdfb\ufe71\ufe77\ufe79\ufe7b\ufe7d]+)|(\ufb05+)/gu, os = new Map([
            [
                "ﬅ",
                "ſt"
            ]
        ])), c.replaceAll(Re, (t, e, s)=>e ? e.normalize("NFKC") : os.get(s));
    }
    function Si() {
        if (typeof crypto.randomUUID == "function") return crypto.randomUUID();
        const c = new Uint8Array(32);
        return crypto.getRandomValues(c), Cs(c);
    }
    const Ge = "pdfjs_internal_id_";
    function Ei(c) {
        return Uint8Array.prototype.toBase64 ? c.toBase64() : btoa(Cs(c));
    }
    typeof Promise.try != "function" && (Promise.try = function(c, ...t) {
        return new Promise((e)=>{
            e(c(...t));
        });
    });
    const Pt = "http://www.w3.org/2000/svg";
    class Vt {
        static CSS = 96;
        static PDF = 72;
        static PDF_TO_CSS_UNITS = this.CSS / this.PDF;
    }
    async function ye(c, t = "text") {
        if (Kt(c, document.baseURI)) {
            const e = await fetch(c);
            if (!e.ok) throw new Error(e.statusText);
            switch(t){
                case "arraybuffer":
                    return e.arrayBuffer();
                case "blob":
                    return e.blob();
                case "json":
                    return e.json();
            }
            return e.text();
        }
        return new Promise((e, s)=>{
            const i = new XMLHttpRequest;
            i.open("GET", c, !0), i.responseType = t, i.onreadystatechange = ()=>{
                if (i.readyState === XMLHttpRequest.DONE) {
                    if (i.status === 200 || i.status === 0) {
                        switch(t){
                            case "arraybuffer":
                            case "blob":
                            case "json":
                                e(i.response);
                                return;
                        }
                        e(i.responseText);
                        return;
                    }
                    s(new Error(i.statusText));
                }
            }, i.send(null);
        });
    }
    class ie {
        constructor({ viewBox: t, userUnit: e, scale: s, rotation: i, offsetX: n = 0, offsetY: r = 0, dontFlip: a = !1 }){
            this.viewBox = t, this.userUnit = e, this.scale = s, this.rotation = i, this.offsetX = n, this.offsetY = r, s *= e;
            const o = (t[2] + t[0]) / 2, l = (t[3] + t[1]) / 2;
            let h, d, u, f;
            switch(i %= 360, i < 0 && (i += 360), i){
                case 180:
                    h = -1, d = 0, u = 0, f = 1;
                    break;
                case 90:
                    h = 0, d = 1, u = 1, f = 0;
                    break;
                case 270:
                    h = 0, d = -1, u = -1, f = 0;
                    break;
                case 0:
                    h = 1, d = 0, u = 0, f = -1;
                    break;
                default:
                    throw new Error("PageViewport: Invalid rotation, must be a multiple of 90 degrees.");
            }
            a && (u = -u, f = -f);
            let p, g, b, m;
            h === 0 ? (p = Math.abs(l - t[1]) * s + n, g = Math.abs(o - t[0]) * s + r, b = (t[3] - t[1]) * s, m = (t[2] - t[0]) * s) : (p = Math.abs(o - t[0]) * s + n, g = Math.abs(l - t[1]) * s + r, b = (t[2] - t[0]) * s, m = (t[3] - t[1]) * s), this.transform = [
                h * s,
                d * s,
                u * s,
                f * s,
                p - h * s * o - u * s * l,
                g - d * s * o - f * s * l
            ], this.width = b, this.height = m;
        }
        get rawDims() {
            const { userUnit: t, viewBox: e } = this, s = e.map((i)=>i * t);
            return O(this, "rawDims", {
                pageWidth: s[2] - s[0],
                pageHeight: s[3] - s[1],
                pageX: s[0],
                pageY: s[1]
            });
        }
        clone({ scale: t = this.scale, rotation: e = this.rotation, offsetX: s = this.offsetX, offsetY: i = this.offsetY, dontFlip: n = !1 } = {}) {
            return new ie({
                viewBox: this.viewBox.slice(),
                userUnit: this.userUnit,
                scale: t,
                rotation: e,
                offsetX: s,
                offsetY: i,
                dontFlip: n
            });
        }
        convertToViewportPoint(t, e) {
            return T.applyTransform([
                t,
                e
            ], this.transform);
        }
        convertToViewportRectangle(t) {
            const e = T.applyTransform([
                t[0],
                t[1]
            ], this.transform), s = T.applyTransform([
                t[2],
                t[3]
            ], this.transform);
            return [
                e[0],
                e[1],
                s[0],
                s[1]
            ];
        }
        convertToPdfPoint(t, e) {
            return T.applyInverseTransform([
                t,
                e
            ], this.transform);
        }
    }
    class je extends Nt {
        constructor(t, e = 0){
            super(t, "RenderingCancelledException"), this.extraDelay = e;
        }
    }
    function ve(c) {
        const t = c.length;
        let e = 0;
        for(; e < t && c[e].trim() === "";)e++;
        return c.substring(e, e + 5).toLowerCase() === "data:";
    }
    function Ue(c) {
        return typeof c == "string" && /\.pdf$/i.test(c);
    }
    function xi(c) {
        return [c] = c.split(/[#?]/, 1), c.substring(c.lastIndexOf("/") + 1);
    }
    function Ci(c, t = "document.pdf") {
        if (typeof c != "string") return t;
        if (ve(c)) return N('getPdfFilenameFromUrl: ignore "data:"-URL for performance reasons.'), t;
        const e = /^(?:(?:[^:]+:)?\/\/[^/]+)?([^?#]*)(\?[^#]*)?(#.*)?$/, s = /[^/?#=]+\.pdf\b(?!.*\.pdf\b)/i, i = e.exec(c);
        let n = s.exec(i[1]) || s.exec(i[2]) || s.exec(i[3]);
        if (n && (n = n[0], n.includes("%"))) try {
            n = s.exec(decodeURIComponent(n))[0];
        } catch  {}
        return n || t;
    }
    class ls {
        started = Object.create(null);
        times = [];
        time(t) {
            t in this.started && N(`Timer is already running for ${t}`), this.started[t] = Date.now();
        }
        timeEnd(t) {
            t in this.started || N(`Timer has not been started for ${t}`), this.times.push({
                name: t,
                start: this.started[t],
                end: Date.now()
            }), delete this.started[t];
        }
        toString() {
            const t = [];
            let e = 0;
            for (const { name: s } of this.times)e = Math.max(s.length, e);
            for (const { name: s, start: i, end: n } of this.times)t.push(`${s.padEnd(e)} ${n - i}ms
`);
            return t.join("");
        }
    }
    function Kt(c, t) {
        try {
            const { protocol: e } = t ? new URL(c, t) : new URL(c);
            return e === "http:" || e === "https:";
        } catch  {
            return !1;
        }
    }
    function _t(c) {
        c.preventDefault();
    }
    function mt(c) {
        c.preventDefault(), c.stopPropagation();
    }
    class Ts {
        static #t;
        static toDateObject(t) {
            if (!t || typeof t != "string") return null;
            this.#t ||= new RegExp("^D:(\\d{4})(\\d{2})?(\\d{2})?(\\d{2})?(\\d{2})?(\\d{2})?([Z|+|-])?(\\d{2})?'?(\\d{2})?'?");
            const e = this.#t.exec(t);
            if (!e) return null;
            const s = parseInt(e[1], 10);
            let i = parseInt(e[2], 10);
            i = i >= 1 && i <= 12 ? i - 1 : 0;
            let n = parseInt(e[3], 10);
            n = n >= 1 && n <= 31 ? n : 1;
            let r = parseInt(e[4], 10);
            r = r >= 0 && r <= 23 ? r : 0;
            let a = parseInt(e[5], 10);
            a = a >= 0 && a <= 59 ? a : 0;
            let o = parseInt(e[6], 10);
            o = o >= 0 && o <= 59 ? o : 0;
            const l = e[7] || "Z";
            let h = parseInt(e[8], 10);
            h = h >= 0 && h <= 23 ? h : 0;
            let d = parseInt(e[9], 10) || 0;
            return d = d >= 0 && d <= 59 ? d : 0, l === "-" ? (r += h, a += d) : l === "+" && (r -= h, a -= d), new Date(Date.UTC(s, i, n, r, a, o));
        }
    }
    function Ti(c, { scale: t = 1, rotation: e = 0 }) {
        const { width: s, height: i } = c.attributes.style, n = [
            0,
            0,
            parseInt(s),
            parseInt(i)
        ];
        return new ie({
            viewBox: n,
            userUnit: 1,
            scale: t,
            rotation: e
        });
    }
    function Ve(c) {
        if (c.startsWith("#")) {
            const t = parseInt(c.slice(1), 16);
            return [
                (t & 16711680) >> 16,
                (t & 65280) >> 8,
                t & 255
            ];
        }
        return c.startsWith("rgb(") ? c.slice(4, -1).split(",").map((t)=>parseInt(t)) : c.startsWith("rgba(") ? c.slice(5, -1).split(",").map((t)=>parseInt(t)).slice(0, 3) : (N(`Not a valid color format: "${c}"`), [
            0,
            0,
            0
        ]);
    }
    function Pi(c) {
        const t = document.createElement("span");
        t.style.visibility = "hidden", document.body.append(t);
        for (const e of c.keys()){
            t.style.color = e;
            const s = window.getComputedStyle(t).color;
            c.set(e, Ve(s));
        }
        t.remove();
    }
    function q(c) {
        const { a: t, b: e, c: s, d: i, e: n, f: r } = c.getTransform();
        return [
            t,
            e,
            s,
            i,
            n,
            r
        ];
    }
    function St(c) {
        const { a: t, b: e, c: s, d: i, e: n, f: r } = c.getTransform().invertSelf();
        return [
            t,
            e,
            s,
            i,
            n,
            r
        ];
    }
    function Ht(c, t, e = !1, s = !0) {
        if (t instanceof ie) {
            const { pageWidth: i, pageHeight: n } = t.rawDims, { style: r } = c, a = dt.isCSSRoundSupported, o = `var(--scale-factor) * ${i}px`, l = `var(--scale-factor) * ${n}px`, h = a ? `round(down, ${o}, var(--scale-round-x, 1px))` : `calc(${o})`, d = a ? `round(down, ${l}, var(--scale-round-y, 1px))` : `calc(${l})`;
            !e || t.rotation % 180 === 0 ? (r.width = h, r.height = d) : (r.width = d, r.height = h);
        }
        s && c.setAttribute("data-main-rotation", t.rotation);
    }
    class Fe {
        constructor(){
            const t = window.devicePixelRatio || 1;
            this.sx = t, this.sy = t;
        }
        get scaled() {
            return this.sx !== 1 || this.sy !== 1;
        }
        get symmetric() {
            return this.sx === this.sy;
        }
    }
    class Zt {
        #t = null;
        #e = null;
        #s;
        #i = null;
        #r = null;
        static #n = null;
        constructor(t){
            this.#s = t, Zt.#n ||= Object.freeze({
                freetext: "pdfjs-editor-remove-freetext-button",
                highlight: "pdfjs-editor-remove-highlight-button",
                ink: "pdfjs-editor-remove-ink-button",
                stamp: "pdfjs-editor-remove-stamp-button"
            });
        }
        render() {
            const t = this.#t = document.createElement("div");
            t.classList.add("editToolbar", "hidden"), t.setAttribute("role", "toolbar");
            const e = this.#s._uiManager._signal;
            t.addEventListener("contextmenu", _t, {
                signal: e
            }), t.addEventListener("pointerdown", Zt.#l, {
                signal: e
            });
            const s = this.#i = document.createElement("div");
            s.className = "buttons", t.append(s);
            const i = this.#s.toolbarPosition;
            if (i) {
                const { style: n } = t, r = this.#s._uiManager.direction === "ltr" ? 1 - i[0] : i[0];
                n.insetInlineEnd = `${100 * r}%`, n.top = `calc(${100 * i[1]}% + var(--editor-toolbar-vert-offset))`;
            }
            return this.#u(), t;
        }
        get div() {
            return this.#t;
        }
        static #l(t) {
            t.stopPropagation();
        }
        #o(t) {
            this.#s._focusEventsAllowed = !1, mt(t);
        }
        #c(t) {
            this.#s._focusEventsAllowed = !0, mt(t);
        }
        #h(t) {
            const e = this.#s._uiManager._signal;
            t.addEventListener("focusin", this.#o.bind(this), {
                capture: !0,
                signal: e
            }), t.addEventListener("focusout", this.#c.bind(this), {
                capture: !0,
                signal: e
            }), t.addEventListener("contextmenu", _t, {
                signal: e
            });
        }
        hide() {
            this.#t.classList.add("hidden"), this.#e?.hideDropdown();
        }
        show() {
            this.#t.classList.remove("hidden"), this.#r?.shown();
        }
        #u() {
            const { editorType: t, _uiManager: e } = this.#s, s = document.createElement("button");
            s.className = "delete", s.tabIndex = 0, s.setAttribute("data-l10n-id", Zt.#n[t]), this.#h(s), s.addEventListener("click", (i)=>{
                e.delete();
            }, {
                signal: e._signal
            }), this.#i.append(s);
        }
        get #d() {
            const t = document.createElement("div");
            return t.className = "divider", t;
        }
        async addAltText(t) {
            const e = await t.render();
            this.#h(e), this.#i.prepend(e, this.#d), this.#r = t;
        }
        addColorPicker(t) {
            this.#e = t;
            const e = t.renderButton();
            this.#h(e), this.#i.prepend(e, this.#d);
        }
        remove() {
            this.#t.remove(), this.#e?.destroy(), this.#e = null;
        }
    }
    class Ri {
        #t = null;
        #e = null;
        #s;
        constructor(t){
            this.#s = t;
        }
        #i() {
            const t = this.#e = document.createElement("div");
            t.className = "editToolbar", t.setAttribute("role", "toolbar"), t.addEventListener("contextmenu", _t, {
                signal: this.#s._signal
            });
            const e = this.#t = document.createElement("div");
            return e.className = "buttons", t.append(e), this.#n(), t;
        }
        #r(t, e) {
            let s = 0, i = 0;
            for (const n of t){
                const r = n.y + n.height;
                if (r < s) continue;
                const a = n.x + (e ? n.width : 0);
                if (r > s) {
                    i = a, s = r;
                    continue;
                }
                e ? a > i && (i = a) : a < i && (i = a);
            }
            return [
                e ? 1 - i : i,
                s
            ];
        }
        show(t, e, s) {
            const [i, n] = this.#r(e, s), { style: r } = this.#e ||= this.#i();
            t.append(this.#e), r.insetInlineEnd = `${100 * i}%`, r.top = `calc(${100 * n}% + var(--editor-toolbar-vert-offset))`;
        }
        hide() {
            this.#e.remove();
        }
        #n() {
            const t = document.createElement("button");
            t.className = "highlightButton", t.tabIndex = 0, t.setAttribute("data-l10n-id", "pdfjs-highlight-floating-button1");
            const e = document.createElement("span");
            t.append(e), e.className = "visuallyHidden", e.setAttribute("data-l10n-id", "pdfjs-highlight-floating-button-label");
            const s = this.#s._signal;
            t.addEventListener("contextmenu", _t, {
                signal: s
            }), t.addEventListener("click", ()=>{
                this.#s.highlightSelection("floating_button");
            }, {
                signal: s
            }), this.#t.append(t);
        }
    }
    function pe(c, t, e) {
        for (const s of e)t.addEventListener(s, c[s].bind(c));
    }
    class Mi {
        #t = 0;
        get id() {
            return `${ci}${this.#t++}`;
        }
    }
    class We {
        #t = Si();
        #e = 0;
        #s = null;
        static get _isSVGFittingCanvas() {
            const t = 'data:image/svg+xml;charset=UTF-8,<svg viewBox="0 0 1 1" width="1" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" style="fill:red;"/></svg>', s = new OffscreenCanvas(1, 3).getContext("2d", {
                willReadFrequently: !0
            }), i = new Image;
            i.src = t;
            const n = i.decode().then(()=>(s.drawImage(i, 0, 0, 1, 1, 0, 0, 1, 3), new Uint32Array(s.getImageData(0, 0, 1, 1).data.buffer)[0] === 0));
            return O(this, "_isSVGFittingCanvas", n);
        }
        async #i(t, e) {
            this.#s ||= new Map;
            let s = this.#s.get(t);
            if (s === null) return null;
            if (s?.bitmap) return s.refCounter += 1, s;
            try {
                s ||= {
                    bitmap: null,
                    id: `image_${this.#t}_${this.#e++}`,
                    refCounter: 0,
                    isSvg: !1
                };
                let i;
                if (typeof e == "string" ? (s.url = e, i = await ye(e, "blob")) : e instanceof File ? i = s.file = e : e instanceof Blob && (i = e), i.type === "image/svg+xml") {
                    const n = We._isSVGFittingCanvas, r = new FileReader, a = new Image, o = new Promise((l, h)=>{
                        a.onload = ()=>{
                            s.bitmap = a, s.isSvg = !0, l();
                        }, r.onload = async ()=>{
                            const d = s.svgUrl = r.result;
                            a.src = await n ? `${d}#svgView(preserveAspectRatio(none))` : d;
                        }, a.onerror = r.onerror = h;
                    });
                    r.readAsDataURL(i), await o;
                } else s.bitmap = await createImageBitmap(i);
                s.refCounter = 1;
            } catch (i) {
                N(i), s = null;
            }
            return this.#s.set(t, s), s && this.#s.set(s.id, s), s;
        }
        async getFromFile(t) {
            const { lastModified: e, name: s, size: i, type: n } = t;
            return this.#i(`${e}_${s}_${i}_${n}`, t);
        }
        async getFromUrl(t) {
            return this.#i(t, t);
        }
        async getFromBlob(t, e) {
            const s = await e;
            return this.#i(t, s);
        }
        async getFromId(t) {
            this.#s ||= new Map;
            const e = this.#s.get(t);
            if (!e) return null;
            if (e.bitmap) return e.refCounter += 1, e;
            if (e.file) return this.getFromFile(e.file);
            if (e.blobPromise) {
                const { blobPromise: s } = e;
                return delete e.blobPromise, this.getFromBlob(e.id, s);
            }
            return this.getFromUrl(e.url);
        }
        getFromCanvas(t, e) {
            this.#s ||= new Map;
            let s = this.#s.get(t);
            if (s?.bitmap) return s.refCounter += 1, s;
            const i = new OffscreenCanvas(e.width, e.height);
            return i.getContext("2d").drawImage(e, 0, 0), s = {
                bitmap: i.transferToImageBitmap(),
                id: `image_${this.#t}_${this.#e++}`,
                refCounter: 1,
                isSvg: !1
            }, this.#s.set(t, s), this.#s.set(s.id, s), s;
        }
        getSvgUrl(t) {
            const e = this.#s.get(t);
            return e?.isSvg ? e.svgUrl : null;
        }
        deleteId(t) {
            this.#s ||= new Map;
            const e = this.#s.get(t);
            if (!e || (e.refCounter -= 1, e.refCounter !== 0)) return;
            const { bitmap: s } = e;
            if (!e.url && !e.file) {
                const i = new OffscreenCanvas(s.width, s.height);
                i.getContext("bitmaprenderer").transferFromImageBitmap(s), e.blobPromise = i.convertToBlob();
            }
            s.close?.(), e.bitmap = null;
        }
        isValidId(t) {
            return t.startsWith(`image_${this.#t}_`);
        }
    }
    class ki {
        #t = [];
        #e = !1;
        #s;
        #i = -1;
        constructor(t = 128){
            this.#s = t;
        }
        add({ cmd: t, undo: e, post: s, mustExec: i, type: n = NaN, overwriteIfSameType: r = !1, keepUndo: a = !1 }) {
            if (i && t(), this.#e) return;
            const o = {
                cmd: t,
                undo: e,
                post: s,
                type: n
            };
            if (this.#i === -1) {
                this.#t.length > 0 && (this.#t.length = 0), this.#i = 0, this.#t.push(o);
                return;
            }
            if (r && this.#t[this.#i].type === n) {
                a && (o.undo = this.#t[this.#i].undo), this.#t[this.#i] = o;
                return;
            }
            const l = this.#i + 1;
            l === this.#s ? this.#t.splice(0, 1) : (this.#i = l, l < this.#t.length && this.#t.splice(l)), this.#t.push(o);
        }
        undo() {
            if (this.#i === -1) return;
            this.#e = !0;
            const { undo: t, post: e } = this.#t[this.#i];
            t(), e?.(), this.#e = !1, this.#i -= 1;
        }
        redo() {
            if (this.#i < this.#t.length - 1) {
                this.#i += 1, this.#e = !0;
                const { cmd: t, post: e } = this.#t[this.#i];
                t(), e?.(), this.#e = !1;
            }
        }
        hasSomethingToUndo() {
            return this.#i !== -1;
        }
        hasSomethingToRedo() {
            return this.#i < this.#t.length - 1;
        }
        cleanType(t) {
            if (this.#i !== -1) {
                for(let e = this.#i; e >= 0; e--)if (this.#t[e].type !== t) {
                    this.#t.splice(e + 1, this.#i - e), this.#i = e;
                    return;
                }
                this.#t.length = 0, this.#i = -1;
            }
        }
        destroy() {
            this.#t = null;
        }
    }
    class ne {
        constructor(t){
            this.buffer = [], this.callbacks = new Map, this.allKeys = new Set;
            const { isMac: e } = dt.platform;
            for (const [s, i, n = {}] of t)for (const r of s){
                const a = r.startsWith("mac+");
                e && a ? (this.callbacks.set(r.slice(4), {
                    callback: i,
                    options: n
                }), this.allKeys.add(r.split("+").at(-1))) : !e && !a && (this.callbacks.set(r, {
                    callback: i,
                    options: n
                }), this.allKeys.add(r.split("+").at(-1)));
            }
        }
        #t(t) {
            t.altKey && this.buffer.push("alt"), t.ctrlKey && this.buffer.push("ctrl"), t.metaKey && this.buffer.push("meta"), t.shiftKey && this.buffer.push("shift"), this.buffer.push(t.key);
            const e = this.buffer.join("+");
            return this.buffer.length = 0, e;
        }
        exec(t, e) {
            if (!this.allKeys.has(e.key)) return;
            const s = this.callbacks.get(this.#t(e));
            if (!s) return;
            const { callback: i, options: { bubbles: n = !1, args: r = [], checker: a = null } } = s;
            a && !a(t, e) || (i.bind(t, ...r, e)(), n || mt(e));
        }
    }
    class Xe {
        static _colorsMapping = new Map([
            [
                "CanvasText",
                [
                    0,
                    0,
                    0
                ]
            ],
            [
                "Canvas",
                [
                    255,
                    255,
                    255
                ]
            ]
        ]);
        get _colors() {
            const t = new Map([
                [
                    "CanvasText",
                    null
                ],
                [
                    "Canvas",
                    null
                ]
            ]);
            return Pi(t), O(this, "_colors", t);
        }
        convert(t) {
            const e = Ve(t);
            if (!window.matchMedia("(forced-colors: active)").matches) return e;
            for (const [s, i] of this._colors)if (i.every((n, r)=>n === e[r])) return Xe._colorsMapping.get(s);
            return e;
        }
        getHexCode(t) {
            const e = this._colors.get(t);
            return e ? T.makeHexColor(...e) : t;
        }
    }
    class Dt {
        #t = new AbortController;
        #e = null;
        #s = new Map;
        #i = new Map;
        #r = null;
        #n = null;
        #l = null;
        #o = new ki;
        #c = null;
        #h = null;
        #u = 0;
        #d = new Set;
        #f = null;
        #a = null;
        #p = new Set;
        _editorUndoBar = null;
        #m = !1;
        #g = !1;
        #b = !1;
        #v = null;
        #A = null;
        #w = null;
        #S = null;
        #x = !1;
        #T = null;
        #R = new Mi;
        #_ = !1;
        #P = !1;
        #C = null;
        #k = null;
        #D = null;
        #N = null;
        #E = F.NONE;
        #y = new Set;
        #L = null;
        #z = null;
        #G = null;
        #j = {
            isEditing: !1,
            isEmpty: !0,
            hasSomethingToUndo: !1,
            hasSomethingToRedo: !1,
            hasSelectedEditor: !1,
            hasSelectedText: !1
        };
        #O = [
            0,
            0
        ];
        #F = null;
        #B = null;
        #U = null;
        #I = null;
        static TRANSLATE_SMALL = 1;
        static TRANSLATE_BIG = 10;
        static get _keyboardManager() {
            const t = Dt.prototype, e = (r)=>r.#B.contains(document.activeElement) && document.activeElement.tagName !== "BUTTON" && r.hasSomethingToControl(), s = (r, { target: a })=>{
                if (a instanceof HTMLInputElement) {
                    const { type: o } = a;
                    return o !== "text" && o !== "number";
                }
                return !0;
            }, i = this.TRANSLATE_SMALL, n = this.TRANSLATE_BIG;
            return O(this, "_keyboardManager", new ne([
                [
                    [
                        "ctrl+a",
                        "mac+meta+a"
                    ],
                    t.selectAll,
                    {
                        checker: s
                    }
                ],
                [
                    [
                        "ctrl+z",
                        "mac+meta+z"
                    ],
                    t.undo,
                    {
                        checker: s
                    }
                ],
                [
                    [
                        "ctrl+y",
                        "ctrl+shift+z",
                        "mac+meta+shift+z",
                        "ctrl+shift+Z",
                        "mac+meta+shift+Z"
                    ],
                    t.redo,
                    {
                        checker: s
                    }
                ],
                [
                    [
                        "Backspace",
                        "alt+Backspace",
                        "ctrl+Backspace",
                        "shift+Backspace",
                        "mac+Backspace",
                        "mac+alt+Backspace",
                        "mac+ctrl+Backspace",
                        "Delete",
                        "ctrl+Delete",
                        "shift+Delete",
                        "mac+Delete"
                    ],
                    t.delete,
                    {
                        checker: s
                    }
                ],
                [
                    [
                        "Enter",
                        "mac+Enter"
                    ],
                    t.addNewEditorFromKeyboard,
                    {
                        checker: (r, { target: a })=>!(a instanceof HTMLButtonElement) && r.#B.contains(a) && !r.isEnterHandled
                    }
                ],
                [
                    [
                        " ",
                        "mac+ "
                    ],
                    t.addNewEditorFromKeyboard,
                    {
                        checker: (r, { target: a })=>!(a instanceof HTMLButtonElement) && r.#B.contains(document.activeElement)
                    }
                ],
                [
                    [
                        "Escape",
                        "mac+Escape"
                    ],
                    t.unselectAll
                ],
                [
                    [
                        "ArrowLeft",
                        "mac+ArrowLeft"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            -i,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowLeft",
                        "mac+shift+ArrowLeft"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            -n,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ArrowRight",
                        "mac+ArrowRight"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            i,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowRight",
                        "mac+shift+ArrowRight"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            n,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ArrowUp",
                        "mac+ArrowUp"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            0,
                            -i
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowUp",
                        "mac+shift+ArrowUp"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            0,
                            -n
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ArrowDown",
                        "mac+ArrowDown"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            0,
                            i
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowDown",
                        "mac+shift+ArrowDown"
                    ],
                    t.translateSelectedEditors,
                    {
                        args: [
                            0,
                            n
                        ],
                        checker: e
                    }
                ]
            ]));
        }
        constructor(t, e, s, i, n, r, a, o, l, h, d, u, f){
            const p = this._signal = this.#t.signal;
            this.#B = t, this.#U = e, this.#r = s, this._eventBus = i, i._on("editingaction", this.onEditingAction.bind(this), {
                signal: p
            }), i._on("pagechanging", this.onPageChanging.bind(this), {
                signal: p
            }), i._on("scalechanging", this.onScaleChanging.bind(this), {
                signal: p
            }), i._on("rotationchanging", this.onRotationChanging.bind(this), {
                signal: p
            }), i._on("setpreference", this.onSetPreference.bind(this), {
                signal: p
            }), i._on("switchannotationeditorparams", (g)=>this.updateParams(g.type, g.value), {
                signal: p
            }), this.#et(), this.#rt(), this.#q(), this.#n = n.annotationStorage, this.#v = n.filterFactory, this.#z = r, this.#S = a || null, this.#m = o, this.#g = l, this.#b = h, this.#N = d || null, this.viewParameters = {
                realScale: Vt.PDF_TO_CSS_UNITS,
                rotation: 0
            }, this.isShiftKeyDown = !1, this._editorUndoBar = u || null, this._supportsPinchToZoom = f !== !1;
        }
        destroy() {
            this.#I?.resolve(), this.#I = null, this.#t?.abort(), this.#t = null, this._signal = null;
            for (const t of this.#i.values())t.destroy();
            this.#i.clear(), this.#s.clear(), this.#p.clear(), this.#e = null, this.#y.clear(), this.#o.destroy(), this.#r?.destroy(), this.#T?.hide(), this.#T = null, this.#A && (clearTimeout(this.#A), this.#A = null), this.#F && (clearTimeout(this.#F), this.#F = null), this._editorUndoBar?.destroy();
        }
        combinedSignal(t) {
            return AbortSignal.any([
                this._signal,
                t.signal
            ]);
        }
        get mlManager() {
            return this.#N;
        }
        get useNewAltTextFlow() {
            return this.#g;
        }
        get useNewAltTextWhenAddingImage() {
            return this.#b;
        }
        get hcmFilter() {
            return O(this, "hcmFilter", this.#z ? this.#v.addHCMFilter(this.#z.foreground, this.#z.background) : "none");
        }
        get direction() {
            return O(this, "direction", getComputedStyle(this.#B).direction);
        }
        get highlightColors() {
            return O(this, "highlightColors", this.#S ? new Map(this.#S.split(",").map((t)=>t.split("=").map((e)=>e.trim()))) : null);
        }
        get highlightColorNames() {
            return O(this, "highlightColorNames", this.highlightColors ? new Map(Array.from(this.highlightColors, (t)=>t.reverse())) : null);
        }
        setCurrentDrawingSession(t) {
            t ? (this.unselectAll(), this.disableUserSelect(!0)) : this.disableUserSelect(!1), this.#h = t;
        }
        setMainHighlightColorPicker(t) {
            this.#D = t;
        }
        editAltText(t, e = !1) {
            this.#r?.editAltText(this, t, e);
        }
        switchToMode(t, e) {
            this._eventBus.on("annotationeditormodechanged", e, {
                once: !0,
                signal: this._signal
            }), this._eventBus.dispatch("showannotationeditorui", {
                source: this,
                mode: t
            });
        }
        setPreference(t, e) {
            this._eventBus.dispatch("setpreference", {
                source: this,
                name: t,
                value: e
            });
        }
        onSetPreference({ name: t, value: e }) {
            t === "enableNewAltTextWhenAddingImage" && (this.#b = e);
        }
        onPageChanging({ pageNumber: t }) {
            this.#u = t - 1;
        }
        focusMainContainer() {
            this.#B.focus();
        }
        findParent(t, e) {
            for (const s of this.#i.values()){
                const { x: i, y: n, width: r, height: a } = s.div.getBoundingClientRect();
                if (t >= i && t <= i + r && e >= n && e <= n + a) return s;
            }
            return null;
        }
        disableUserSelect(t = !1) {
            this.#U.classList.toggle("noUserSelect", t);
        }
        addShouldRescale(t) {
            this.#p.add(t);
        }
        removeShouldRescale(t) {
            this.#p.delete(t);
        }
        onScaleChanging({ scale: t }) {
            this.commitOrRemove(), this.viewParameters.realScale = t * Vt.PDF_TO_CSS_UNITS;
            for (const e of this.#p)e.onScaleChanging();
            this.#h?.onScaleChanging();
        }
        onRotationChanging({ pagesRotation: t }) {
            this.commitOrRemove(), this.viewParameters.rotation = t;
        }
        #H({ anchorNode: t }) {
            return t.nodeType === Node.TEXT_NODE ? t.parentElement : t;
        }
        #X(t) {
            const { currentLayer: e } = this;
            if (e.hasTextLayer(t)) return e;
            for (const s of this.#i.values())if (s.hasTextLayer(t)) return s;
            return null;
        }
        highlightSelection(t = "") {
            const e = document.getSelection();
            if (!e || e.isCollapsed) return;
            const { anchorNode: s, anchorOffset: i, focusNode: n, focusOffset: r } = e, a = e.toString(), l = this.#H(e).closest(".textLayer"), h = this.getSelectionBoxes(l);
            if (!h) return;
            e.empty();
            const d = this.#X(l), u = this.#E === F.NONE, f = ()=>{
                d?.createAndAddNewEditor({
                    x: 0,
                    y: 0
                }, !1, {
                    methodOfCreation: t,
                    boxes: h,
                    anchorNode: s,
                    anchorOffset: i,
                    focusNode: n,
                    focusOffset: r,
                    text: a
                }), u && this.showAllEditors("highlight", !0, !0);
            };
            if (u) {
                this.switchToMode(F.HIGHLIGHT, f);
                return;
            }
            f();
        }
        #Z() {
            const t = document.getSelection();
            if (!t || t.isCollapsed) return;
            const s = this.#H(t).closest(".textLayer"), i = this.getSelectionBoxes(s);
            i && (this.#T ||= new Ri(this), this.#T.show(s, i, this.direction === "ltr"));
        }
        addToAnnotationStorage(t) {
            !t.isEmpty() && this.#n && !this.#n.has(t.id) && this.#n.setValue(t.id, t);
        }
        #tt() {
            const t = document.getSelection();
            if (!t || t.isCollapsed) {
                this.#L && (this.#T?.hide(), this.#L = null, this.#M({
                    hasSelectedText: !1
                }));
                return;
            }
            const { anchorNode: e } = t;
            if (e === this.#L) return;
            const i = this.#H(t).closest(".textLayer");
            if (!i) {
                this.#L && (this.#T?.hide(), this.#L = null, this.#M({
                    hasSelectedText: !1
                }));
                return;
            }
            if (this.#T?.hide(), this.#L = e, this.#M({
                hasSelectedText: !0
            }), !(this.#E !== F.HIGHLIGHT && this.#E !== F.NONE) && (this.#E === F.HIGHLIGHT && this.showAllEditors("highlight", !0, !0), this.#x = this.isShiftKeyDown, !this.isShiftKeyDown)) {
                const n = this.#E === F.HIGHLIGHT ? this.#X(i) : null;
                n?.toggleDrawing();
                const r = new AbortController, a = this.combinedSignal(r), o = (l)=>{
                    l.type === "pointerup" && l.button !== 0 || (r.abort(), n?.toggleDrawing(!0), l.type === "pointerup" && this.#W("main_toolbar"));
                };
                window.addEventListener("pointerup", o, {
                    signal: a
                }), window.addEventListener("blur", o, {
                    signal: a
                });
            }
        }
        #W(t = "") {
            this.#E === F.HIGHLIGHT ? this.highlightSelection(t) : this.#m && this.#Z();
        }
        #et() {
            document.addEventListener("selectionchange", this.#tt.bind(this), {
                signal: this._signal
            });
        }
        #st() {
            if (this.#w) return;
            this.#w = new AbortController;
            const t = this.combinedSignal(this.#w);
            window.addEventListener("focus", this.focus.bind(this), {
                signal: t
            }), window.addEventListener("blur", this.blur.bind(this), {
                signal: t
            });
        }
        #it() {
            this.#w?.abort(), this.#w = null;
        }
        blur() {
            if (this.isShiftKeyDown = !1, this.#x && (this.#x = !1, this.#W("main_toolbar")), !this.hasSelection) return;
            const { activeElement: t } = document;
            for (const e of this.#y)if (e.div.contains(t)) {
                this.#k = [
                    e,
                    t
                ], e._focusEventsAllowed = !1;
                break;
            }
        }
        focus() {
            if (!this.#k) return;
            const [t, e] = this.#k;
            this.#k = null, e.addEventListener("focusin", ()=>{
                t._focusEventsAllowed = !0;
            }, {
                once: !0,
                signal: this._signal
            }), e.focus();
        }
        #q() {
            if (this.#C) return;
            this.#C = new AbortController;
            const t = this.combinedSignal(this.#C);
            window.addEventListener("keydown", this.keydown.bind(this), {
                signal: t
            }), window.addEventListener("keyup", this.keyup.bind(this), {
                signal: t
            });
        }
        #nt() {
            this.#C?.abort(), this.#C = null;
        }
        #Y() {
            if (this.#c) return;
            this.#c = new AbortController;
            const t = this.combinedSignal(this.#c);
            document.addEventListener("copy", this.copy.bind(this), {
                signal: t
            }), document.addEventListener("cut", this.cut.bind(this), {
                signal: t
            }), document.addEventListener("paste", this.paste.bind(this), {
                signal: t
            });
        }
        #K() {
            this.#c?.abort(), this.#c = null;
        }
        #rt() {
            const t = this._signal;
            document.addEventListener("dragover", this.dragOver.bind(this), {
                signal: t
            }), document.addEventListener("drop", this.drop.bind(this), {
                signal: t
            });
        }
        addEditListeners() {
            this.#q(), this.#Y();
        }
        removeEditListeners() {
            this.#nt(), this.#K();
        }
        dragOver(t) {
            for (const { type: e } of t.dataTransfer.items)for (const s of this.#a)if (s.isHandlingMimeForPasting(e)) {
                t.dataTransfer.dropEffect = "copy", t.preventDefault();
                return;
            }
        }
        drop(t) {
            for (const e of t.dataTransfer.items)for (const s of this.#a)if (s.isHandlingMimeForPasting(e.type)) {
                s.paste(e, this.currentLayer), t.preventDefault();
                return;
            }
        }
        copy(t) {
            if (t.preventDefault(), this.#e?.commitOrRemove(), !this.hasSelection) return;
            const e = [];
            for (const s of this.#y){
                const i = s.serialize(!0);
                i && e.push(i);
            }
            e.length !== 0 && t.clipboardData.setData("application/pdfjs", JSON.stringify(e));
        }
        cut(t) {
            this.copy(t), this.delete();
        }
        async paste(t) {
            t.preventDefault();
            const { clipboardData: e } = t;
            for (const n of e.items)for (const r of this.#a)if (r.isHandlingMimeForPasting(n.type)) {
                r.paste(n, this.currentLayer);
                return;
            }
            let s = e.getData("application/pdfjs");
            if (!s) return;
            try {
                s = JSON.parse(s);
            } catch (n) {
                N(`paste: "${n.message}".`);
                return;
            }
            if (!Array.isArray(s)) return;
            this.unselectAll();
            const i = this.currentLayer;
            try {
                const n = [];
                for (const o of s){
                    const l = await i.deserialize(o);
                    if (!l) return;
                    n.push(l);
                }
                const r = ()=>{
                    for (const o of n)this.#Q(o);
                    this.#J(n);
                }, a = ()=>{
                    for (const o of n)o.remove();
                };
                this.addCommands({
                    cmd: r,
                    undo: a,
                    mustExec: !0
                });
            } catch (n) {
                N(`paste: "${n.message}".`);
            }
        }
        keydown(t) {
            !this.isShiftKeyDown && t.key === "Shift" && (this.isShiftKeyDown = !0), this.#E !== F.NONE && !this.isEditorHandlingKeyboard && Dt._keyboardManager.exec(this, t);
        }
        keyup(t) {
            this.isShiftKeyDown && t.key === "Shift" && (this.isShiftKeyDown = !1, this.#x && (this.#x = !1, this.#W("main_toolbar")));
        }
        onEditingAction({ name: t }) {
            switch(t){
                case "undo":
                case "redo":
                case "delete":
                case "selectAll":
                    this[t]();
                    break;
                case "highlightSelection":
                    this.highlightSelection("context_menu");
                    break;
            }
        }
        #M(t) {
            Object.entries(t).some(([s, i])=>this.#j[s] !== i) && (this._eventBus.dispatch("annotationeditorstateschanged", {
                source: this,
                details: Object.assign(this.#j, t)
            }), this.#E === F.HIGHLIGHT && t.hasSelectedEditor === !1 && this.#$([
                [
                    H.HIGHLIGHT_FREE,
                    !0
                ]
            ]));
        }
        #$(t) {
            this._eventBus.dispatch("annotationeditorparamschanged", {
                source: this,
                details: t
            });
        }
        setEditingState(t) {
            t ? (this.#st(), this.#Y(), this.#M({
                isEditing: this.#E !== F.NONE,
                isEmpty: this.#V(),
                hasSomethingToUndo: this.#o.hasSomethingToUndo(),
                hasSomethingToRedo: this.#o.hasSomethingToRedo(),
                hasSelectedEditor: !1
            })) : (this.#it(), this.#K(), this.#M({
                isEditing: !1
            }), this.disableUserSelect(!1));
        }
        registerEditorTypes(t) {
            if (!this.#a) {
                this.#a = t;
                for (const e of this.#a)this.#$(e.defaultPropertiesToUpdate);
            }
        }
        getId() {
            return this.#R.id;
        }
        get currentLayer() {
            return this.#i.get(this.#u);
        }
        getLayer(t) {
            return this.#i.get(t);
        }
        get currentPageIndex() {
            return this.#u;
        }
        addLayer(t) {
            this.#i.set(t.pageIndex, t), this.#_ ? t.enable() : t.disable();
        }
        removeLayer(t) {
            this.#i.delete(t.pageIndex);
        }
        async updateMode(t, e = null, s = !1) {
            if (this.#E !== t && !(this.#I && (await this.#I.promise, !this.#I))) {
                if (this.#I = Promise.withResolvers(), this.#E = t, t === F.NONE) {
                    this.setEditingState(!1), this.#ot(), this._editorUndoBar?.hide(), this.#I.resolve();
                    return;
                }
                this.setEditingState(!0), await this.#at(), this.unselectAll();
                for (const i of this.#i.values())i.updateMode(t);
                if (!e) {
                    s && this.addNewEditorFromKeyboard(), this.#I.resolve();
                    return;
                }
                for (const i of this.#s.values())i.annotationElementId === e ? (this.setSelected(i), i.enterInEditMode()) : i.unselect();
                this.#I.resolve();
            }
        }
        addNewEditorFromKeyboard() {
            this.currentLayer.canCreateNewEmptyEditor() && this.currentLayer.addNewEditor();
        }
        updateToolbar(t) {
            t !== this.#E && this._eventBus.dispatch("switchannotationeditormode", {
                source: this,
                mode: t
            });
        }
        updateParams(t, e) {
            if (this.#a) {
                switch(t){
                    case H.CREATE:
                        this.currentLayer.addNewEditor();
                        return;
                    case H.HIGHLIGHT_DEFAULT_COLOR:
                        this.#D?.updateColor(e);
                        break;
                    case H.HIGHLIGHT_SHOW_ALL:
                        this._eventBus.dispatch("reporttelemetry", {
                            source: this,
                            details: {
                                type: "editing",
                                data: {
                                    type: "highlight",
                                    action: "toggle_visibility"
                                }
                            }
                        }), (this.#G ||= new Map).set(t, e), this.showAllEditors("highlight", e);
                        break;
                }
                for (const s of this.#y)s.updateParams(t, e);
                for (const s of this.#a)s.updateDefaultParams(t, e);
            }
        }
        showAllEditors(t, e, s = !1) {
            for (const n of this.#s.values())n.editorType === t && n.show(e);
            (this.#G?.get(H.HIGHLIGHT_SHOW_ALL) ?? !0) !== e && this.#$([
                [
                    H.HIGHLIGHT_SHOW_ALL,
                    e
                ]
            ]);
        }
        enableWaiting(t = !1) {
            if (this.#P !== t) {
                this.#P = t;
                for (const e of this.#i.values())t ? e.disableClick() : e.enableClick(), e.div.classList.toggle("waiting", t);
            }
        }
        async #at() {
            if (!this.#_) {
                this.#_ = !0;
                const t = [];
                for (const e of this.#i.values())t.push(e.enable());
                await Promise.all(t);
                for (const e of this.#s.values())e.enable();
            }
        }
        #ot() {
            if (this.unselectAll(), this.#_) {
                this.#_ = !1;
                for (const t of this.#i.values())t.disable();
                for (const t of this.#s.values())t.disable();
            }
        }
        getEditors(t) {
            const e = [];
            for (const s of this.#s.values())s.pageIndex === t && e.push(s);
            return e;
        }
        getEditor(t) {
            return this.#s.get(t);
        }
        addEditor(t) {
            this.#s.set(t.id, t);
        }
        removeEditor(t) {
            t.div.contains(document.activeElement) && (this.#A && clearTimeout(this.#A), this.#A = setTimeout(()=>{
                this.focusMainContainer(), this.#A = null;
            }, 0)), this.#s.delete(t.id), this.unselect(t), (!t.annotationElementId || !this.#d.has(t.annotationElementId)) && this.#n?.remove(t.id);
        }
        addDeletedAnnotationElement(t) {
            this.#d.add(t.annotationElementId), this.addChangedExistingAnnotation(t), t.deleted = !0;
        }
        isDeletedAnnotationElement(t) {
            return this.#d.has(t);
        }
        removeDeletedAnnotationElement(t) {
            this.#d.delete(t.annotationElementId), this.removeChangedExistingAnnotation(t), t.deleted = !1;
        }
        #Q(t) {
            const e = this.#i.get(t.pageIndex);
            e ? e.addOrRebuild(t) : (this.addEditor(t), this.addToAnnotationStorage(t));
        }
        setActiveEditor(t) {
            this.#e !== t && (this.#e = t, t && this.#$(t.propertiesToUpdate));
        }
        get #lt() {
            let t = null;
            for (t of this.#y);
            return t;
        }
        updateUI(t) {
            this.#lt === t && this.#$(t.propertiesToUpdate);
        }
        updateUIForDefaultProperties(t) {
            this.#$(t.defaultPropertiesToUpdate);
        }
        toggleSelected(t) {
            if (this.#y.has(t)) {
                this.#y.delete(t), t.unselect(), this.#M({
                    hasSelectedEditor: this.hasSelection
                });
                return;
            }
            this.#y.add(t), t.select(), this.#$(t.propertiesToUpdate), this.#M({
                hasSelectedEditor: !0
            });
        }
        setSelected(t) {
            this.#h?.commitOrRemove();
            for (const e of this.#y)e !== t && e.unselect();
            this.#y.clear(), this.#y.add(t), t.select(), this.#$(t.propertiesToUpdate), this.#M({
                hasSelectedEditor: !0
            });
        }
        isSelected(t) {
            return this.#y.has(t);
        }
        get firstSelectedEditor() {
            return this.#y.values().next().value;
        }
        unselect(t) {
            t.unselect(), this.#y.delete(t), this.#M({
                hasSelectedEditor: this.hasSelection
            });
        }
        get hasSelection() {
            return this.#y.size !== 0;
        }
        get isEnterHandled() {
            return this.#y.size === 1 && this.firstSelectedEditor.isEnterHandled;
        }
        undo() {
            this.#o.undo(), this.#M({
                hasSomethingToUndo: this.#o.hasSomethingToUndo(),
                hasSomethingToRedo: !0,
                isEmpty: this.#V()
            }), this._editorUndoBar?.hide();
        }
        redo() {
            this.#o.redo(), this.#M({
                hasSomethingToUndo: !0,
                hasSomethingToRedo: this.#o.hasSomethingToRedo(),
                isEmpty: this.#V()
            });
        }
        addCommands(t) {
            this.#o.add(t), this.#M({
                hasSomethingToUndo: !0,
                hasSomethingToRedo: !1,
                isEmpty: this.#V()
            });
        }
        cleanUndoStack(t) {
            this.#o.cleanType(t);
        }
        #V() {
            if (this.#s.size === 0) return !0;
            if (this.#s.size === 1) for (const t of this.#s.values())return t.isEmpty();
            return !1;
        }
        delete() {
            this.commitOrRemove();
            const t = this.currentLayer?.endDrawingSession(!0);
            if (!this.hasSelection && !t) return;
            const e = t ? [
                t
            ] : [
                ...this.#y
            ], s = ()=>{
                this._editorUndoBar?.show(i, e.length === 1 ? e[0].editorType : e.length);
                for (const n of e)n.remove();
            }, i = ()=>{
                for (const n of e)this.#Q(n);
            };
            this.addCommands({
                cmd: s,
                undo: i,
                mustExec: !0
            });
        }
        commitOrRemove() {
            this.#e?.commitOrRemove();
        }
        hasSomethingToControl() {
            return this.#e || this.hasSelection;
        }
        #J(t) {
            for (const e of this.#y)e.unselect();
            this.#y.clear();
            for (const e of t)e.isEmpty() || (this.#y.add(e), e.select());
            this.#M({
                hasSelectedEditor: this.hasSelection
            });
        }
        selectAll() {
            for (const t of this.#y)t.commit();
            this.#J(this.#s.values());
        }
        unselectAll() {
            if (!(this.#e && (this.#e.commitOrRemove(), this.#E !== F.NONE)) && !this.#h?.commitOrRemove() && this.hasSelection) {
                for (const t of this.#y)t.unselect();
                this.#y.clear(), this.#M({
                    hasSelectedEditor: !1
                });
            }
        }
        translateSelectedEditors(t, e, s = !1) {
            if (s || this.commitOrRemove(), !this.hasSelection) return;
            this.#O[0] += t, this.#O[1] += e;
            const [i, n] = this.#O, r = [
                ...this.#y
            ], a = 1e3;
            this.#F && clearTimeout(this.#F), this.#F = setTimeout(()=>{
                this.#F = null, this.#O[0] = this.#O[1] = 0, this.addCommands({
                    cmd: ()=>{
                        for (const o of r)this.#s.has(o.id) && o.translateInPage(i, n);
                    },
                    undo: ()=>{
                        for (const o of r)this.#s.has(o.id) && o.translateInPage(-i, -n);
                    },
                    mustExec: !1
                });
            }, a);
            for (const o of r)o.translateInPage(t, e);
        }
        setUpDragSession() {
            if (this.hasSelection) {
                this.disableUserSelect(!0), this.#f = new Map;
                for (const t of this.#y)this.#f.set(t, {
                    savedX: t.x,
                    savedY: t.y,
                    savedPageIndex: t.pageIndex,
                    newX: 0,
                    newY: 0,
                    newPageIndex: -1
                });
            }
        }
        endDragSession() {
            if (!this.#f) return !1;
            this.disableUserSelect(!1);
            const t = this.#f;
            this.#f = null;
            let e = !1;
            for (const [{ x: i, y: n, pageIndex: r }, a] of t)a.newX = i, a.newY = n, a.newPageIndex = r, e ||= i !== a.savedX || n !== a.savedY || r !== a.savedPageIndex;
            if (!e) return !1;
            const s = (i, n, r, a)=>{
                if (this.#s.has(i.id)) {
                    const o = this.#i.get(a);
                    o ? i._setParentAndPosition(o, n, r) : (i.pageIndex = a, i.x = n, i.y = r);
                }
            };
            return this.addCommands({
                cmd: ()=>{
                    for (const [i, { newX: n, newY: r, newPageIndex: a }] of t)s(i, n, r, a);
                },
                undo: ()=>{
                    for (const [i, { savedX: n, savedY: r, savedPageIndex: a }] of t)s(i, n, r, a);
                },
                mustExec: !0
            }), !0;
        }
        dragSelectedEditors(t, e) {
            if (this.#f) for (const s of this.#f.keys())s.drag(t, e);
        }
        rebuild(t) {
            if (t.parent === null) {
                const e = this.getLayer(t.pageIndex);
                e ? (e.changeParent(t), e.addOrRebuild(t)) : (this.addEditor(t), this.addToAnnotationStorage(t), t.rebuild());
            } else t.parent.addOrRebuild(t);
        }
        get isEditorHandlingKeyboard() {
            return this.getActive()?.shouldGetKeyboardEvents() || this.#y.size === 1 && this.firstSelectedEditor.shouldGetKeyboardEvents();
        }
        isActive(t) {
            return this.#e === t;
        }
        getActive() {
            return this.#e;
        }
        getMode() {
            return this.#E;
        }
        get imageManager() {
            return O(this, "imageManager", new We);
        }
        getSelectionBoxes(t) {
            if (!t) return null;
            const e = document.getSelection();
            for(let l = 0, h = e.rangeCount; l < h; l++)if (!t.contains(e.getRangeAt(l).commonAncestorContainer)) return null;
            const { x: s, y: i, width: n, height: r } = t.getBoundingClientRect();
            let a;
            switch(t.getAttribute("data-main-rotation")){
                case "90":
                    a = (l, h, d, u)=>({
                            x: (h - i) / r,
                            y: 1 - (l + d - s) / n,
                            width: u / r,
                            height: d / n
                        });
                    break;
                case "180":
                    a = (l, h, d, u)=>({
                            x: 1 - (l + d - s) / n,
                            y: 1 - (h + u - i) / r,
                            width: d / n,
                            height: u / r
                        });
                    break;
                case "270":
                    a = (l, h, d, u)=>({
                            x: 1 - (h + u - i) / r,
                            y: (l - s) / n,
                            width: u / r,
                            height: d / n
                        });
                    break;
                default:
                    a = (l, h, d, u)=>({
                            x: (l - s) / n,
                            y: (h - i) / r,
                            width: d / n,
                            height: u / r
                        });
                    break;
            }
            const o = [];
            for(let l = 0, h = e.rangeCount; l < h; l++){
                const d = e.getRangeAt(l);
                if (!d.collapsed) for (const { x: u, y: f, width: p, height: g } of d.getClientRects())p === 0 || g === 0 || o.push(a(u, f, p, g));
            }
            return o.length === 0 ? null : o;
        }
        addChangedExistingAnnotation({ annotationElementId: t, id: e }) {
            (this.#l ||= new Map).set(t, e);
        }
        removeChangedExistingAnnotation({ annotationElementId: t }) {
            this.#l?.delete(t);
        }
        renderAnnotationElement(t) {
            const e = this.#l?.get(t.data.id);
            if (!e) return;
            const s = this.#n.getRawValue(e);
            s && (this.#E === F.NONE && !s.hasBeenModified || s.renderAnnotationElement(t));
        }
    }
    class xt {
        #t = null;
        #e = !1;
        #s = null;
        #i = null;
        #r = null;
        #n = null;
        #l = !1;
        #o = null;
        #c = null;
        #h = null;
        #u = null;
        #d = !1;
        static #f = null;
        static _l10n = null;
        constructor(t){
            this.#c = t, this.#d = t._uiManager.useNewAltTextFlow, xt.#f ||= Object.freeze({
                added: "pdfjs-editor-new-alt-text-added-button",
                "added-label": "pdfjs-editor-new-alt-text-added-button-label",
                missing: "pdfjs-editor-new-alt-text-missing-button",
                "missing-label": "pdfjs-editor-new-alt-text-missing-button-label",
                review: "pdfjs-editor-new-alt-text-to-review-button",
                "review-label": "pdfjs-editor-new-alt-text-to-review-button-label"
            });
        }
        static initialize(t) {
            xt._l10n ??= t;
        }
        async render() {
            const t = this.#s = document.createElement("button");
            t.className = "altText", t.tabIndex = "0";
            const e = this.#i = document.createElement("span");
            t.append(e), this.#d ? (t.classList.add("new"), t.setAttribute("data-l10n-id", xt.#f.missing), e.setAttribute("data-l10n-id", xt.#f["missing-label"])) : (t.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-button"), e.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-button-label"));
            const s = this.#c._uiManager._signal;
            t.addEventListener("contextmenu", _t, {
                signal: s
            }), t.addEventListener("pointerdown", (n)=>n.stopPropagation(), {
                signal: s
            });
            const i = (n)=>{
                n.preventDefault(), this.#c._uiManager.editAltText(this.#c), this.#d && this.#c._reportTelemetry({
                    action: "pdfjs.image.alt_text.image_status_label_clicked",
                    data: {
                        label: this.#a
                    }
                });
            };
            return t.addEventListener("click", i, {
                capture: !0,
                signal: s
            }), t.addEventListener("keydown", (n)=>{
                n.target === t && n.key === "Enter" && (this.#l = !0, i(n));
            }, {
                signal: s
            }), await this.#p(), t;
        }
        get #a() {
            return this.#t && "added" || this.#t === null && this.guessedText && "review" || "missing";
        }
        finish() {
            this.#s && (this.#s.focus({
                focusVisible: this.#l
            }), this.#l = !1);
        }
        isEmpty() {
            return this.#d ? this.#t === null : !this.#t && !this.#e;
        }
        hasData() {
            return this.#d ? this.#t !== null || !!this.#h : this.isEmpty();
        }
        get guessedText() {
            return this.#h;
        }
        async setGuessedText(t) {
            this.#t === null && (this.#h = t, this.#u = await xt._l10n.get("pdfjs-editor-new-alt-text-generated-alt-text-with-disclaimer", {
                generatedAltText: t
            }), this.#p());
        }
        toggleAltTextBadge(t = !1) {
            if (!this.#d || this.#t) {
                this.#o?.remove(), this.#o = null;
                return;
            }
            if (!this.#o) {
                const e = this.#o = document.createElement("div");
                e.className = "noAltTextBadge", this.#c.div.append(e);
            }
            this.#o.classList.toggle("hidden", !t);
        }
        serialize(t) {
            let e = this.#t;
            return !t && this.#h === e && (e = this.#u), {
                altText: e,
                decorative: this.#e,
                guessedText: this.#h,
                textWithDisclaimer: this.#u
            };
        }
        get data() {
            return {
                altText: this.#t,
                decorative: this.#e
            };
        }
        set data({ altText: t, decorative: e, guessedText: s, textWithDisclaimer: i, cancel: n = !1 }) {
            s && (this.#h = s, this.#u = i), !(this.#t === t && this.#e === e) && (n || (this.#t = t, this.#e = e), this.#p());
        }
        toggle(t = !1) {
            this.#s && (!t && this.#n && (clearTimeout(this.#n), this.#n = null), this.#s.disabled = !t);
        }
        shown() {
            this.#c._reportTelemetry({
                action: "pdfjs.image.alt_text.image_status_label_displayed",
                data: {
                    label: this.#a
                }
            });
        }
        destroy() {
            this.#s?.remove(), this.#s = null, this.#i = null, this.#r = null, this.#o?.remove(), this.#o = null;
        }
        async #p() {
            const t = this.#s;
            if (!t) return;
            if (this.#d) {
                if (t.classList.toggle("done", !!this.#t), t.setAttribute("data-l10n-id", xt.#f[this.#a]), this.#i?.setAttribute("data-l10n-id", xt.#f[`${this.#a}-label`]), !this.#t) {
                    this.#r?.remove();
                    return;
                }
            } else {
                if (!this.#t && !this.#e) {
                    t.classList.remove("done"), this.#r?.remove();
                    return;
                }
                t.classList.add("done"), t.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-edit-button");
            }
            let e = this.#r;
            if (!e) {
                this.#r = e = document.createElement("span"), e.className = "tooltip", e.setAttribute("role", "tooltip"), e.id = `alt-text-tooltip-${this.#c.id}`;
                const i = 100, n = this.#c._uiManager._signal;
                n.addEventListener("abort", ()=>{
                    clearTimeout(this.#n), this.#n = null;
                }, {
                    once: !0
                }), t.addEventListener("mouseenter", ()=>{
                    this.#n = setTimeout(()=>{
                        this.#n = null, this.#r.classList.add("show"), this.#c._reportTelemetry({
                            action: "alt_text_tooltip"
                        });
                    }, i);
                }, {
                    signal: n
                }), t.addEventListener("mouseleave", ()=>{
                    this.#n && (clearTimeout(this.#n), this.#n = null), this.#r?.classList.remove("show");
                }, {
                    signal: n
                });
            }
            this.#e ? e.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-decorative-tooltip") : (e.removeAttribute("data-l10n-id"), e.textContent = this.#t), e.parentNode || t.append(e), this.#c.getImageForAltText()?.setAttribute("aria-describedby", e.id);
        }
    }
    class we {
        #t;
        #e = !1;
        #s = null;
        #i;
        #r;
        #n;
        #l;
        #o;
        #c = null;
        #h;
        #u = null;
        constructor({ container: t, isPinchingDisabled: e = null, isPinchingStopped: s = null, onPinchStart: i = null, onPinching: n = null, onPinchEnd: r = null, signal: a }){
            this.#t = t, this.#s = s, this.#i = e, this.#r = i, this.#n = n, this.#l = r, this.#h = new AbortController, this.#o = AbortSignal.any([
                a,
                this.#h.signal
            ]), t.addEventListener("touchstart", this.#d.bind(this), {
                passive: !1,
                signal: this.#o
            });
        }
        get MIN_TOUCH_DISTANCE_TO_PINCH() {
            return O(this, "MIN_TOUCH_DISTANCE_TO_PINCH", 35 / (window.devicePixelRatio || 1));
        }
        #d(t) {
            if (this.#i?.() || t.touches.length < 2) return;
            if (!this.#u) {
                this.#u = new AbortController;
                const i = AbortSignal.any([
                    this.#o,
                    this.#u.signal
                ]), n = this.#t, r = {
                    signal: i,
                    passive: !1
                };
                n.addEventListener("touchmove", this.#f.bind(this), r), n.addEventListener("touchend", this.#a.bind(this), r), n.addEventListener("touchcancel", this.#a.bind(this), r), this.#r?.();
            }
            if (mt(t), t.touches.length !== 2 || this.#s?.()) {
                this.#c = null;
                return;
            }
            let [e, s] = t.touches;
            e.identifier > s.identifier && ([e, s] = [
                s,
                e
            ]), this.#c = {
                touch0X: e.screenX,
                touch0Y: e.screenY,
                touch1X: s.screenX,
                touch1Y: s.screenY
            };
        }
        #f(t) {
            if (!this.#c || t.touches.length !== 2) return;
            let [e, s] = t.touches;
            e.identifier > s.identifier && ([e, s] = [
                s,
                e
            ]);
            const { screenX: i, screenY: n } = e, { screenX: r, screenY: a } = s, o = this.#c, { touch0X: l, touch0Y: h, touch1X: d, touch1Y: u } = o, f = d - l, p = u - h, g = r - i, b = a - n, m = Math.hypot(g, b) || 1, A = Math.hypot(f, p) || 1;
            if (!this.#e && Math.abs(A - m) <= we.MIN_TOUCH_DISTANCE_TO_PINCH) return;
            if (o.touch0X = i, o.touch0Y = n, o.touch1X = r, o.touch1Y = a, t.preventDefault(), !this.#e) {
                this.#e = !0;
                return;
            }
            const y = [
                (i + r) / 2,
                (n + a) / 2
            ];
            this.#n?.(y, A, m);
        }
        #a(t) {
            this.#u.abort(), this.#u = null, this.#l?.(), this.#c && (t.preventDefault(), this.#c = null, this.#e = !1);
        }
        destroy() {
            this.#h?.abort(), this.#h = null;
        }
    }
    class I {
        #t = null;
        #e = null;
        #s = null;
        #i = !1;
        #r = null;
        #n = "";
        #l = !1;
        #o = null;
        #c = null;
        #h = null;
        #u = null;
        #d = "";
        #f = !1;
        #a = null;
        #p = !1;
        #m = !1;
        #g = !1;
        #b = null;
        #v = 0;
        #A = 0;
        #w = null;
        #S = null;
        _editToolbar = null;
        _initialOptions = Object.create(null);
        _initialData = null;
        _isVisible = !0;
        _uiManager = null;
        _focusEventsAllowed = !0;
        static _l10n = null;
        static _l10nResizer = null;
        #x = !1;
        #T = I._zIndex++;
        static _borderLineWidth = -1;
        static _colorManager = new Xe;
        static _zIndex = 1;
        static _telemetryTimeout = 1e3;
        static get _resizerKeyboardManager() {
            const t = I.prototype._resizeWithKeyboard, e = Dt.TRANSLATE_SMALL, s = Dt.TRANSLATE_BIG;
            return O(this, "_resizerKeyboardManager", new ne([
                [
                    [
                        "ArrowLeft",
                        "mac+ArrowLeft"
                    ],
                    t,
                    {
                        args: [
                            -e,
                            0
                        ]
                    }
                ],
                [
                    [
                        "ctrl+ArrowLeft",
                        "mac+shift+ArrowLeft"
                    ],
                    t,
                    {
                        args: [
                            -s,
                            0
                        ]
                    }
                ],
                [
                    [
                        "ArrowRight",
                        "mac+ArrowRight"
                    ],
                    t,
                    {
                        args: [
                            e,
                            0
                        ]
                    }
                ],
                [
                    [
                        "ctrl+ArrowRight",
                        "mac+shift+ArrowRight"
                    ],
                    t,
                    {
                        args: [
                            s,
                            0
                        ]
                    }
                ],
                [
                    [
                        "ArrowUp",
                        "mac+ArrowUp"
                    ],
                    t,
                    {
                        args: [
                            0,
                            -e
                        ]
                    }
                ],
                [
                    [
                        "ctrl+ArrowUp",
                        "mac+shift+ArrowUp"
                    ],
                    t,
                    {
                        args: [
                            0,
                            -s
                        ]
                    }
                ],
                [
                    [
                        "ArrowDown",
                        "mac+ArrowDown"
                    ],
                    t,
                    {
                        args: [
                            0,
                            e
                        ]
                    }
                ],
                [
                    [
                        "ctrl+ArrowDown",
                        "mac+shift+ArrowDown"
                    ],
                    t,
                    {
                        args: [
                            0,
                            s
                        ]
                    }
                ],
                [
                    [
                        "Escape",
                        "mac+Escape"
                    ],
                    I.prototype._stopResizingWithKeyboard
                ]
            ]));
        }
        constructor(t){
            this.parent = t.parent, this.id = t.id, this.width = this.height = null, this.pageIndex = t.parent.pageIndex, this.name = t.name, this.div = null, this._uiManager = t.uiManager, this.annotationElementId = null, this._willKeepAspectRatio = !1, this._initialOptions.isCentered = t.isCentered, this._structTreeParentId = null;
            const { rotation: e, rawDims: { pageWidth: s, pageHeight: i, pageX: n, pageY: r } } = this.parent.viewport;
            this.rotation = e, this.pageRotation = (360 + e - this._uiManager.viewParameters.rotation) % 360, this.pageDimensions = [
                s,
                i
            ], this.pageTranslation = [
                n,
                r
            ];
            const [a, o] = this.parentDimensions;
            this.x = t.x / a, this.y = t.y / o, this.isAttachedToDOM = !1, this.deleted = !1;
        }
        get editorType() {
            return Object.getPrototypeOf(this).constructor._type;
        }
        static get isDrawer() {
            return !1;
        }
        static get _defaultLineColor() {
            return O(this, "_defaultLineColor", this._colorManager.getHexCode("CanvasText"));
        }
        static deleteAnnotationElement(t) {
            const e = new Ii({
                id: t.parent.getNextId(),
                parent: t.parent,
                uiManager: t._uiManager
            });
            e.annotationElementId = t.annotationElementId, e.deleted = !0, e._uiManager.addToAnnotationStorage(e);
        }
        static initialize(t, e) {
            if (I._l10n ??= t, I._l10nResizer ||= Object.freeze({
                topLeft: "pdfjs-editor-resizer-top-left",
                topMiddle: "pdfjs-editor-resizer-top-middle",
                topRight: "pdfjs-editor-resizer-top-right",
                middleRight: "pdfjs-editor-resizer-middle-right",
                bottomRight: "pdfjs-editor-resizer-bottom-right",
                bottomMiddle: "pdfjs-editor-resizer-bottom-middle",
                bottomLeft: "pdfjs-editor-resizer-bottom-left",
                middleLeft: "pdfjs-editor-resizer-middle-left"
            }), I._borderLineWidth !== -1) return;
            const s = getComputedStyle(document.documentElement);
            I._borderLineWidth = parseFloat(s.getPropertyValue("--outline-width")) || 0;
        }
        static updateDefaultParams(t, e) {}
        static get defaultPropertiesToUpdate() {
            return [];
        }
        static isHandlingMimeForPasting(t) {
            return !1;
        }
        static paste(t, e) {
            V("Not implemented");
        }
        get propertiesToUpdate() {
            return [];
        }
        get _isDraggable() {
            return this.#x;
        }
        set _isDraggable(t) {
            this.#x = t, this.div?.classList.toggle("draggable", t);
        }
        get isEnterHandled() {
            return !0;
        }
        center() {
            const [t, e] = this.pageDimensions;
            switch(this.parentRotation){
                case 90:
                    this.x -= this.height * e / (t * 2), this.y += this.width * t / (e * 2);
                    break;
                case 180:
                    this.x += this.width / 2, this.y += this.height / 2;
                    break;
                case 270:
                    this.x += this.height * e / (t * 2), this.y -= this.width * t / (e * 2);
                    break;
                default:
                    this.x -= this.width / 2, this.y -= this.height / 2;
                    break;
            }
            this.fixAndSetPosition();
        }
        addCommands(t) {
            this._uiManager.addCommands(t);
        }
        get currentLayer() {
            return this._uiManager.currentLayer;
        }
        setInBackground() {
            this.div.style.zIndex = 0;
        }
        setInForeground() {
            this.div.style.zIndex = this.#T;
        }
        setParent(t) {
            t !== null ? (this.pageIndex = t.pageIndex, this.pageDimensions = t.pageDimensions) : this.#H(), this.parent = t;
        }
        focusin(t) {
            this._focusEventsAllowed && (this.#f ? this.#f = !1 : this.parent.setSelected(this));
        }
        focusout(t) {
            !this._focusEventsAllowed || !this.isAttachedToDOM || t.relatedTarget?.closest(`#${this.id}`) || (t.preventDefault(), this.parent?.isMultipleSelection || this.commitOrRemove());
        }
        commitOrRemove() {
            this.isEmpty() ? this.remove() : this.commit();
        }
        commit() {
            this.addToAnnotationStorage();
        }
        addToAnnotationStorage() {
            this._uiManager.addToAnnotationStorage(this);
        }
        setAt(t, e, s, i) {
            const [n, r] = this.parentDimensions;
            [s, i] = this.screenToPageTranslation(s, i), this.x = (t + s) / n, this.y = (e + i) / r, this.fixAndSetPosition();
        }
        #R([t, e], s, i) {
            [s, i] = this.screenToPageTranslation(s, i), this.x += s / t, this.y += i / e, this._onTranslating(this.x, this.y), this.fixAndSetPosition();
        }
        translate(t, e) {
            this.#R(this.parentDimensions, t, e);
        }
        translateInPage(t, e) {
            this.#a ||= [
                this.x,
                this.y,
                this.width,
                this.height
            ], this.#R(this.pageDimensions, t, e), this.div.scrollIntoView({
                block: "nearest"
            });
        }
        drag(t, e) {
            this.#a ||= [
                this.x,
                this.y,
                this.width,
                this.height
            ];
            const { div: s, parentDimensions: [i, n] } = this;
            if (this.x += t / i, this.y += e / n, this.parent && (this.x < 0 || this.x > 1 || this.y < 0 || this.y > 1)) {
                const { x: d, y: u } = this.div.getBoundingClientRect();
                this.parent.findNewParent(this, d, u) && (this.x -= Math.floor(this.x), this.y -= Math.floor(this.y));
            }
            let { x: r, y: a } = this;
            const [o, l] = this.getBaseTranslation();
            r += o, a += l;
            const { style: h } = s;
            h.left = `${(100 * r).toFixed(2)}%`, h.top = `${(100 * a).toFixed(2)}%`, this._onTranslating(r, a), s.scrollIntoView({
                block: "nearest"
            });
        }
        _onTranslating(t, e) {}
        _onTranslated(t, e) {}
        get _hasBeenMoved() {
            return !!this.#a && (this.#a[0] !== this.x || this.#a[1] !== this.y);
        }
        get _hasBeenResized() {
            return !!this.#a && (this.#a[2] !== this.width || this.#a[3] !== this.height);
        }
        getBaseTranslation() {
            const [t, e] = this.parentDimensions, { _borderLineWidth: s } = I, i = s / t, n = s / e;
            switch(this.rotation){
                case 90:
                    return [
                        -i,
                        n
                    ];
                case 180:
                    return [
                        i,
                        n
                    ];
                case 270:
                    return [
                        i,
                        -n
                    ];
                default:
                    return [
                        -i,
                        -n
                    ];
            }
        }
        get _mustFixPosition() {
            return !0;
        }
        fixAndSetPosition(t = this.rotation) {
            const { div: { style: e }, pageDimensions: [s, i] } = this;
            let { x: n, y: r, width: a, height: o } = this;
            if (a *= s, o *= i, n *= s, r *= i, this._mustFixPosition) switch(t){
                case 0:
                    n = Math.max(0, Math.min(s - a, n)), r = Math.max(0, Math.min(i - o, r));
                    break;
                case 90:
                    n = Math.max(0, Math.min(s - o, n)), r = Math.min(i, Math.max(a, r));
                    break;
                case 180:
                    n = Math.min(s, Math.max(a, n)), r = Math.min(i, Math.max(o, r));
                    break;
                case 270:
                    n = Math.min(s, Math.max(o, n)), r = Math.max(0, Math.min(i - a, r));
                    break;
            }
            this.x = n /= s, this.y = r /= i;
            const [l, h] = this.getBaseTranslation();
            n += l, r += h, e.left = `${(100 * n).toFixed(2)}%`, e.top = `${(100 * r).toFixed(2)}%`, this.moveInDOM();
        }
        static #_(t, e, s) {
            switch(s){
                case 90:
                    return [
                        e,
                        -t
                    ];
                case 180:
                    return [
                        -t,
                        -e
                    ];
                case 270:
                    return [
                        -e,
                        t
                    ];
                default:
                    return [
                        t,
                        e
                    ];
            }
        }
        screenToPageTranslation(t, e) {
            return I.#_(t, e, this.parentRotation);
        }
        pageTranslationToScreen(t, e) {
            return I.#_(t, e, 360 - this.parentRotation);
        }
        #P(t) {
            switch(t){
                case 90:
                    {
                        const [e, s] = this.pageDimensions;
                        return [
                            0,
                            -e / s,
                            s / e,
                            0
                        ];
                    }
                case 180:
                    return [
                        -1,
                        0,
                        0,
                        -1
                    ];
                case 270:
                    {
                        const [e, s] = this.pageDimensions;
                        return [
                            0,
                            e / s,
                            -s / e,
                            0
                        ];
                    }
                default:
                    return [
                        1,
                        0,
                        0,
                        1
                    ];
            }
        }
        get parentScale() {
            return this._uiManager.viewParameters.realScale;
        }
        get parentRotation() {
            return (this._uiManager.viewParameters.rotation + this.pageRotation) % 360;
        }
        get parentDimensions() {
            const { parentScale: t, pageDimensions: [e, s] } = this;
            return [
                e * t,
                s * t
            ];
        }
        setDims(t, e) {
            const [s, i] = this.parentDimensions, { style: n } = this.div;
            n.width = `${(100 * t / s).toFixed(2)}%`, this.#l || (n.height = `${(100 * e / i).toFixed(2)}%`);
        }
        fixDims() {
            const { style: t } = this.div, { height: e, width: s } = t, i = s.endsWith("%"), n = !this.#l && e.endsWith("%");
            if (i && n) return;
            const [r, a] = this.parentDimensions;
            i || (t.width = `${(100 * parseFloat(s) / r).toFixed(2)}%`), !this.#l && !n && (t.height = `${(100 * parseFloat(e) / a).toFixed(2)}%`);
        }
        getInitialTranslation() {
            return [
                0,
                0
            ];
        }
        #C() {
            if (this.#o) return;
            this.#o = document.createElement("div"), this.#o.classList.add("resizers");
            const t = this._willKeepAspectRatio ? [
                "topLeft",
                "topRight",
                "bottomRight",
                "bottomLeft"
            ] : [
                "topLeft",
                "topMiddle",
                "topRight",
                "middleRight",
                "bottomRight",
                "bottomMiddle",
                "bottomLeft",
                "middleLeft"
            ], e = this._uiManager._signal;
            for (const s of t){
                const i = document.createElement("div");
                this.#o.append(i), i.classList.add("resizer", s), i.setAttribute("data-resizer-name", s), i.addEventListener("pointerdown", this.#k.bind(this, s), {
                    signal: e
                }), i.addEventListener("contextmenu", _t, {
                    signal: e
                }), i.tabIndex = -1;
            }
            this.div.prepend(this.#o);
        }
        #k(t, e) {
            e.preventDefault();
            const { isMac: s } = dt.platform;
            if (e.button !== 0 || e.ctrlKey && s) return;
            this.#s?.toggle(!1);
            const i = this._isDraggable;
            this._isDraggable = !1, this.#c = [
                e.screenX,
                e.screenY
            ];
            const n = new AbortController, r = this._uiManager.combinedSignal(n);
            this.parent.togglePointerEvents(!1), window.addEventListener("pointermove", this.#E.bind(this, t), {
                passive: !0,
                capture: !0,
                signal: r
            }), window.addEventListener("touchmove", mt, {
                passive: !1,
                signal: r
            }), window.addEventListener("contextmenu", _t, {
                signal: r
            }), this.#h = {
                savedX: this.x,
                savedY: this.y,
                savedWidth: this.width,
                savedHeight: this.height
            };
            const a = this.parent.div.style.cursor, o = this.div.style.cursor;
            this.div.style.cursor = this.parent.div.style.cursor = window.getComputedStyle(e.target).cursor;
            const l = ()=>{
                n.abort(), this.parent.togglePointerEvents(!0), this.#s?.toggle(!0), this._isDraggable = i, this.parent.div.style.cursor = a, this.div.style.cursor = o, this.#N();
            };
            window.addEventListener("pointerup", l, {
                signal: r
            }), window.addEventListener("blur", l, {
                signal: r
            });
        }
        #D(t, e, s, i) {
            this.width = s, this.height = i, this.x = t, this.y = e;
            const [n, r] = this.parentDimensions;
            this.setDims(n * s, r * i), this.fixAndSetPosition(), this._onResized();
        }
        _onResized() {}
        #N() {
            if (!this.#h) return;
            const { savedX: t, savedY: e, savedWidth: s, savedHeight: i } = this.#h;
            this.#h = null;
            const n = this.x, r = this.y, a = this.width, o = this.height;
            n === t && r === e && a === s && o === i || this.addCommands({
                cmd: this.#D.bind(this, n, r, a, o),
                undo: this.#D.bind(this, t, e, s, i),
                mustExec: !0
            });
        }
        static _round(t) {
            return Math.round(t * 1e4) / 1e4;
        }
        #E(t, e) {
            const [s, i] = this.parentDimensions, n = this.x, r = this.y, a = this.width, o = this.height, l = I.MIN_SIZE / s, h = I.MIN_SIZE / i, d = this.#P(this.rotation), u = (E, x)=>[
                    d[0] * E + d[2] * x,
                    d[1] * E + d[3] * x
                ], f = this.#P(360 - this.rotation), p = (E, x)=>[
                    f[0] * E + f[2] * x,
                    f[1] * E + f[3] * x
                ];
            let g, b, m = !1, A = !1;
            switch(t){
                case "topLeft":
                    m = !0, g = (E, x)=>[
                            0,
                            0
                        ], b = (E, x)=>[
                            E,
                            x
                        ];
                    break;
                case "topMiddle":
                    g = (E, x)=>[
                            E / 2,
                            0
                        ], b = (E, x)=>[
                            E / 2,
                            x
                        ];
                    break;
                case "topRight":
                    m = !0, g = (E, x)=>[
                            E,
                            0
                        ], b = (E, x)=>[
                            0,
                            x
                        ];
                    break;
                case "middleRight":
                    A = !0, g = (E, x)=>[
                            E,
                            x / 2
                        ], b = (E, x)=>[
                            0,
                            x / 2
                        ];
                    break;
                case "bottomRight":
                    m = !0, g = (E, x)=>[
                            E,
                            x
                        ], b = (E, x)=>[
                            0,
                            0
                        ];
                    break;
                case "bottomMiddle":
                    g = (E, x)=>[
                            E / 2,
                            x
                        ], b = (E, x)=>[
                            E / 2,
                            0
                        ];
                    break;
                case "bottomLeft":
                    m = !0, g = (E, x)=>[
                            0,
                            x
                        ], b = (E, x)=>[
                            E,
                            0
                        ];
                    break;
                case "middleLeft":
                    A = !0, g = (E, x)=>[
                            0,
                            x / 2
                        ], b = (E, x)=>[
                            E,
                            x / 2
                        ];
                    break;
            }
            const y = g(a, o), v = b(a, o);
            let w = u(...v);
            const S = I._round(n + w[0]), _ = I._round(r + w[1]);
            let R = 1, M = 1, $, D;
            if (e.fromKeyboard) ({ deltaX: $, deltaY: D } = e);
            else {
                const { screenX: E, screenY: x } = e, [z, Y] = this.#c;
                [$, D] = this.screenToPageTranslation(E - z, x - Y), this.#c[0] = E, this.#c[1] = x;
            }
            if ([$, D] = p($ / s, D / i), m) {
                const E = Math.hypot(a, o);
                R = M = Math.max(Math.min(Math.hypot(v[0] - y[0] - $, v[1] - y[1] - D) / E, 1 / a, 1 / o), l / a, h / o);
            } else A ? R = Math.max(l, Math.min(1, Math.abs(v[0] - y[0] - $))) / a : M = Math.max(h, Math.min(1, Math.abs(v[1] - y[1] - D))) / o;
            const j = I._round(a * R), K = I._round(o * M);
            w = u(...b(j, K));
            const P = S - w[0], B = _ - w[1];
            this.#a ||= [
                this.x,
                this.y,
                this.width,
                this.height
            ], this.width = j, this.height = K, this.x = P, this.y = B, this.setDims(s * j, i * K), this.fixAndSetPosition(), this._onResizing();
        }
        _onResizing() {}
        altTextFinish() {
            this.#s?.finish();
        }
        async addEditToolbar() {
            return this._editToolbar || this.#m ? this._editToolbar : (this._editToolbar = new Zt(this), this.div.append(this._editToolbar.render()), this.#s && await this._editToolbar.addAltText(this.#s), this._editToolbar);
        }
        removeEditToolbar() {
            this._editToolbar && (this._editToolbar.remove(), this._editToolbar = null, this.#s?.destroy());
        }
        addContainer(t) {
            const e = this._editToolbar?.div;
            e ? e.before(t) : this.div.append(t);
        }
        getClientDimensions() {
            return this.div.getBoundingClientRect();
        }
        async addAltTextButton() {
            this.#s || (xt.initialize(I._l10n), this.#s = new xt(this), this.#t && (this.#s.data = this.#t, this.#t = null), await this.addEditToolbar());
        }
        get altTextData() {
            return this.#s?.data;
        }
        set altTextData(t) {
            this.#s && (this.#s.data = t);
        }
        get guessedAltText() {
            return this.#s?.guessedText;
        }
        async setGuessedAltText(t) {
            await this.#s?.setGuessedText(t);
        }
        serializeAltText(t) {
            return this.#s?.serialize(t);
        }
        hasAltText() {
            return !!this.#s && !this.#s.isEmpty();
        }
        hasAltTextData() {
            return this.#s?.hasData() ?? !1;
        }
        render() {
            this.div = document.createElement("div"), this.div.setAttribute("data-editor-rotation", (360 - this.rotation) % 360), this.div.className = this.name, this.div.setAttribute("id", this.id), this.div.tabIndex = this.#i ? -1 : 0, this._isVisible || this.div.classList.add("hidden"), this.setInForeground(), this.#O();
            const [t, e] = this.parentDimensions;
            this.parentRotation % 180 !== 0 && (this.div.style.maxWidth = `${(100 * e / t).toFixed(2)}%`, this.div.style.maxHeight = `${(100 * t / e).toFixed(2)}%`);
            const [s, i] = this.getInitialTranslation();
            return this.translate(s, i), pe(this, this.div, [
                "pointerdown"
            ]), this.isResizable && this._uiManager._supportsPinchToZoom && (this.#S ||= new we({
                container: this.div,
                isPinchingDisabled: ()=>!this.isSelected,
                onPinchStart: this.#y.bind(this),
                onPinching: this.#L.bind(this),
                onPinchEnd: this.#z.bind(this),
                signal: this._uiManager._signal
            })), this._uiManager._editorUndoBar?.hide(), this.div;
        }
        #y() {
            this.#h = {
                savedX: this.x,
                savedY: this.y,
                savedWidth: this.width,
                savedHeight: this.height
            }, this.#s?.toggle(!1), this.parent.togglePointerEvents(!1);
        }
        #L(t, e, s) {
            let n = .7 * (s / e) + 1 - .7;
            if (n === 1) return;
            const r = this.#P(this.rotation), a = (S, _)=>[
                    r[0] * S + r[2] * _,
                    r[1] * S + r[3] * _
                ], [o, l] = this.parentDimensions, h = this.x, d = this.y, u = this.width, f = this.height, p = I.MIN_SIZE / o, g = I.MIN_SIZE / l;
            n = Math.max(Math.min(n, 1 / u, 1 / f), p / u, g / f);
            const b = I._round(u * n), m = I._round(f * n);
            if (b === u && m === f) return;
            this.#a ||= [
                h,
                d,
                u,
                f
            ];
            const A = a(u / 2, f / 2), y = I._round(h + A[0]), v = I._round(d + A[1]), w = a(b / 2, m / 2);
            this.x = y - w[0], this.y = v - w[1], this.width = b, this.height = m, this.setDims(o * b, l * m), this.fixAndSetPosition(), this._onResizing();
        }
        #z() {
            this.#s?.toggle(!0), this.parent.togglePointerEvents(!0), this.#N();
        }
        pointerdown(t) {
            const { isMac: e } = dt.platform;
            if (t.button !== 0 || t.ctrlKey && e) {
                t.preventDefault();
                return;
            }
            if (this.#f = !0, this._isDraggable) {
                this.#j(t);
                return;
            }
            this.#G(t);
        }
        get isSelected() {
            return this._uiManager.isSelected(this);
        }
        #G(t) {
            const { isMac: e } = dt.platform;
            t.ctrlKey && !e || t.shiftKey || t.metaKey && e ? this.parent.toggleSelected(this) : this.parent.setSelected(this);
        }
        #j(t) {
            const { isSelected: e } = this;
            this._uiManager.setUpDragSession();
            let s = !1;
            const i = new AbortController, n = this._uiManager.combinedSignal(i), r = {
                capture: !0,
                passive: !1,
                signal: n
            }, a = (l)=>{
                i.abort(), this.#r = null, this.#f = !1, this._uiManager.endDragSession() || this.#G(l), s && this._onStopDragging();
            };
            e && (this.#v = t.clientX, this.#A = t.clientY, this.#r = t.pointerId, this.#n = t.pointerType, window.addEventListener("pointermove", (l)=>{
                s || (s = !0, this._onStartDragging());
                const { clientX: h, clientY: d, pointerId: u } = l;
                if (u !== this.#r) {
                    mt(l);
                    return;
                }
                const [f, p] = this.screenToPageTranslation(h - this.#v, d - this.#A);
                this.#v = h, this.#A = d, this._uiManager.dragSelectedEditors(f, p);
            }, r), window.addEventListener("touchmove", mt, r), window.addEventListener("pointerdown", (l)=>{
                l.pointerType === this.#n && (this.#S || l.isPrimary) && a(l), mt(l);
            }, r));
            const o = (l)=>{
                if (!this.#r || this.#r === l.pointerId) {
                    a(l);
                    return;
                }
                mt(l);
            };
            window.addEventListener("pointerup", o, {
                signal: n
            }), window.addEventListener("blur", o, {
                signal: n
            });
        }
        _onStartDragging() {}
        _onStopDragging() {}
        moveInDOM() {
            this.#b && clearTimeout(this.#b), this.#b = setTimeout(()=>{
                this.#b = null, this.parent?.moveEditorInDOM(this);
            }, 0);
        }
        _setParentAndPosition(t, e, s) {
            t.changeParent(this), this.x = e, this.y = s, this.fixAndSetPosition(), this._onTranslated();
        }
        getRect(t, e, s = this.rotation) {
            const i = this.parentScale, [n, r] = this.pageDimensions, [a, o] = this.pageTranslation, l = t / i, h = e / i, d = this.x * n, u = this.y * r, f = this.width * n, p = this.height * r;
            switch(s){
                case 0:
                    return [
                        d + l + a,
                        r - u - h - p + o,
                        d + l + f + a,
                        r - u - h + o
                    ];
                case 90:
                    return [
                        d + h + a,
                        r - u + l + o,
                        d + h + p + a,
                        r - u + l + f + o
                    ];
                case 180:
                    return [
                        d - l - f + a,
                        r - u + h + o,
                        d - l + a,
                        r - u + h + p + o
                    ];
                case 270:
                    return [
                        d - h - p + a,
                        r - u - l - f + o,
                        d - h + a,
                        r - u - l + o
                    ];
                default:
                    throw new Error("Invalid rotation");
            }
        }
        getRectInCurrentCoords(t, e) {
            const [s, i, n, r] = t, a = n - s, o = r - i;
            switch(this.rotation){
                case 0:
                    return [
                        s,
                        e - r,
                        a,
                        o
                    ];
                case 90:
                    return [
                        s,
                        e - i,
                        o,
                        a
                    ];
                case 180:
                    return [
                        n,
                        e - i,
                        a,
                        o
                    ];
                case 270:
                    return [
                        n,
                        e - r,
                        o,
                        a
                    ];
                default:
                    throw new Error("Invalid rotation");
            }
        }
        onceAdded(t) {}
        isEmpty() {
            return !1;
        }
        enableEditMode() {
            this.#m = !0;
        }
        disableEditMode() {
            this.#m = !1;
        }
        isInEditMode() {
            return this.#m;
        }
        shouldGetKeyboardEvents() {
            return this.#g;
        }
        needsToBeRebuilt() {
            return this.div && !this.isAttachedToDOM;
        }
        get isOnScreen() {
            const { top: t, left: e, bottom: s, right: i } = this.getClientDimensions(), { innerHeight: n, innerWidth: r } = window;
            return e < r && i > 0 && t < n && s > 0;
        }
        #O() {
            if (this.#u || !this.div) return;
            this.#u = new AbortController;
            const t = this._uiManager.combinedSignal(this.#u);
            this.div.addEventListener("focusin", this.focusin.bind(this), {
                signal: t
            }), this.div.addEventListener("focusout", this.focusout.bind(this), {
                signal: t
            });
        }
        rebuild() {
            this.#O();
        }
        rotate(t) {}
        resize() {}
        serializeDeleted() {
            return {
                id: this.annotationElementId,
                deleted: !0,
                pageIndex: this.pageIndex,
                popupRef: this._initialData?.popupRef || ""
            };
        }
        serialize(t = !1, e = null) {
            V("An editor must be serializable");
        }
        static async deserialize(t, e, s) {
            const i = new this.prototype.constructor({
                parent: e,
                id: e.getNextId(),
                uiManager: s
            });
            i.rotation = t.rotation, i.#t = t.accessibilityData;
            const [n, r] = i.pageDimensions, [a, o, l, h] = i.getRectInCurrentCoords(t.rect, r);
            return i.x = a / n, i.y = o / r, i.width = l / n, i.height = h / r, i;
        }
        get hasBeenModified() {
            return !!this.annotationElementId && (this.deleted || this.serialize() !== null);
        }
        remove() {
            if (this.#u?.abort(), this.#u = null, this.isEmpty() || this.commit(), this.parent ? this.parent.remove(this) : this._uiManager.removeEditor(this), this.#b && (clearTimeout(this.#b), this.#b = null), this.#H(), this.removeEditToolbar(), this.#w) {
                for (const t of this.#w.values())clearTimeout(t);
                this.#w = null;
            }
            this.parent = null, this.#S?.destroy(), this.#S = null;
        }
        get isResizable() {
            return !1;
        }
        makeResizable() {
            this.isResizable && (this.#C(), this.#o.classList.remove("hidden"), pe(this, this.div, [
                "keydown"
            ]));
        }
        get toolbarPosition() {
            return null;
        }
        keydown(t) {
            if (!this.isResizable || t.target !== this.div || t.key !== "Enter") return;
            this._uiManager.setSelected(this), this.#h = {
                savedX: this.x,
                savedY: this.y,
                savedWidth: this.width,
                savedHeight: this.height
            };
            const e = this.#o.children;
            if (!this.#e) {
                this.#e = Array.from(e);
                const r = this.#F.bind(this), a = this.#B.bind(this), o = this._uiManager._signal;
                for (const l of this.#e){
                    const h = l.getAttribute("data-resizer-name");
                    l.setAttribute("role", "spinbutton"), l.addEventListener("keydown", r, {
                        signal: o
                    }), l.addEventListener("blur", a, {
                        signal: o
                    }), l.addEventListener("focus", this.#U.bind(this, h), {
                        signal: o
                    }), l.setAttribute("data-l10n-id", I._l10nResizer[h]);
                }
            }
            const s = this.#e[0];
            let i = 0;
            for (const r of e){
                if (r === s) break;
                i++;
            }
            const n = (360 - this.rotation + this.parentRotation) % 360 / 90 * (this.#e.length / 4);
            if (n !== i) {
                if (n < i) for(let a = 0; a < i - n; a++)this.#o.append(this.#o.firstChild);
                else if (n > i) for(let a = 0; a < n - i; a++)this.#o.firstChild.before(this.#o.lastChild);
                let r = 0;
                for (const a of e){
                    const l = this.#e[r++].getAttribute("data-resizer-name");
                    a.setAttribute("data-l10n-id", I._l10nResizer[l]);
                }
            }
            this.#I(0), this.#g = !0, this.#o.firstChild.focus({
                focusVisible: !0
            }), t.preventDefault(), t.stopImmediatePropagation();
        }
        #F(t) {
            I._resizerKeyboardManager.exec(this, t);
        }
        #B(t) {
            this.#g && t.relatedTarget?.parentNode !== this.#o && this.#H();
        }
        #U(t) {
            this.#d = this.#g ? t : "";
        }
        #I(t) {
            if (this.#e) for (const e of this.#e)e.tabIndex = t;
        }
        _resizeWithKeyboard(t, e) {
            this.#g && this.#E(this.#d, {
                deltaX: t,
                deltaY: e,
                fromKeyboard: !0
            });
        }
        #H() {
            this.#g = !1, this.#I(-1), this.#N();
        }
        _stopResizingWithKeyboard() {
            this.#H(), this.div.focus();
        }
        select() {
            if (this.makeResizable(), this.div?.classList.add("selectedEditor"), !this._editToolbar) {
                this.addEditToolbar().then(()=>{
                    this.div?.classList.contains("selectedEditor") && this._editToolbar?.show();
                });
                return;
            }
            this._editToolbar?.show(), this.#s?.toggleAltTextBadge(!1);
        }
        unselect() {
            this.#o?.classList.add("hidden"), this.div?.classList.remove("selectedEditor"), this.div?.contains(document.activeElement) && this._uiManager.currentLayer.div.focus({
                preventScroll: !0
            }), this._editToolbar?.hide(), this.#s?.toggleAltTextBadge(!0);
        }
        updateParams(t, e) {}
        disableEditing() {}
        enableEditing() {}
        enterInEditMode() {}
        getImageForAltText() {
            return null;
        }
        get contentDiv() {
            return this.div;
        }
        get isEditing() {
            return this.#p;
        }
        set isEditing(t) {
            this.#p = t, this.parent && (t ? (this.parent.setSelected(this), this.parent.setActiveEditor(this)) : this.parent.setActiveEditor(null));
        }
        setAspectRatio(t, e) {
            this.#l = !0;
            const s = t / e, { style: i } = this.div;
            i.aspectRatio = s, i.height = "auto";
        }
        static get MIN_SIZE() {
            return 16;
        }
        static canCreateNewEmptyEditor() {
            return !0;
        }
        get telemetryInitialData() {
            return {
                action: "added"
            };
        }
        get telemetryFinalData() {
            return null;
        }
        _reportTelemetry(t, e = !1) {
            if (e) {
                this.#w ||= new Map;
                const { action: s } = t;
                let i = this.#w.get(s);
                i && clearTimeout(i), i = setTimeout(()=>{
                    this._reportTelemetry(t), this.#w.delete(s), this.#w.size === 0 && (this.#w = null);
                }, I._telemetryTimeout), this.#w.set(s, i);
                return;
            }
            t.type ||= this.editorType, this._uiManager._eventBus.dispatch("reporttelemetry", {
                source: this,
                details: {
                    type: "editing",
                    data: t
                }
            });
        }
        show(t = this._isVisible) {
            this.div.classList.toggle("hidden", !t), this._isVisible = t;
        }
        enable() {
            this.div && (this.div.tabIndex = 0), this.#i = !1;
        }
        disable() {
            this.div && (this.div.tabIndex = -1), this.#i = !0;
        }
        renderAnnotationElement(t) {
            let e = t.container.querySelector(".annotationContent");
            if (!e) e = document.createElement("div"), e.classList.add("annotationContent", this.editorType), t.container.prepend(e);
            else if (e.nodeName === "CANVAS") {
                const s = e;
                e = document.createElement("div"), e.classList.add("annotationContent", this.editorType), s.before(e);
            }
            return e;
        }
        resetAnnotationElement(t) {
            const { firstChild: e } = t.container;
            e?.nodeName === "DIV" && e.classList.contains("annotationContent") && e.remove();
        }
    }
    class Ii extends I {
        constructor(t){
            super(t), this.annotationElementId = t.annotationElementId, this.deleted = !0;
        }
        serialize() {
            return this.serializeDeleted();
        }
    }
    const hs = 3285377520, At = 4294901760, Et = 65535;
    class Ps {
        constructor(t){
            this.h1 = t ? t & 4294967295 : hs, this.h2 = t ? t & 4294967295 : hs;
        }
        update(t) {
            let e, s;
            if (typeof t == "string") {
                e = new Uint8Array(t.length * 2), s = 0;
                for(let g = 0, b = t.length; g < b; g++){
                    const m = t.charCodeAt(g);
                    m <= 255 ? e[s++] = m : (e[s++] = m >>> 8, e[s++] = m & 255);
                }
            } else if (ArrayBuffer.isView(t)) e = t.slice(), s = e.byteLength;
            else throw new Error("Invalid data format, must be a string or TypedArray.");
            const i = s >> 2, n = s - i * 4, r = new Uint32Array(e.buffer, 0, i);
            let a = 0, o = 0, l = this.h1, h = this.h2;
            const d = 3432918353, u = 461845907, f = d & Et, p = u & Et;
            for(let g = 0; g < i; g++)g & 1 ? (a = r[g], a = a * d & At | a * f & Et, a = a << 15 | a >>> 17, a = a * u & At | a * p & Et, l ^= a, l = l << 13 | l >>> 19, l = l * 5 + 3864292196) : (o = r[g], o = o * d & At | o * f & Et, o = o << 15 | o >>> 17, o = o * u & At | o * p & Et, h ^= o, h = h << 13 | h >>> 19, h = h * 5 + 3864292196);
            switch(a = 0, n){
                case 3:
                    a ^= e[i * 4 + 2] << 16;
                case 2:
                    a ^= e[i * 4 + 1] << 8;
                case 1:
                    a ^= e[i * 4], a = a * d & At | a * f & Et, a = a << 15 | a >>> 17, a = a * u & At | a * p & Et, i & 1 ? l ^= a : h ^= a;
            }
            this.h1 = l, this.h2 = h;
        }
        hexdigest() {
            let t = this.h1, e = this.h2;
            return t ^= e >>> 1, t = t * 3981806797 & At | t * 36045 & Et, e = e * 4283543511 & At | ((e << 16 | t >>> 16) * 2950163797 & At) >>> 16, t ^= e >>> 1, t = t * 444984403 & At | t * 60499 & Et, e = e * 3301882366 & At | ((e << 16 | t >>> 16) * 3120437893 & At) >>> 16, t ^= e >>> 1, (t >>> 0).toString(16).padStart(8, "0") + (e >>> 0).toString(16).padStart(8, "0");
        }
    }
    const Ne = Object.freeze({
        map: null,
        hash: "",
        transfer: void 0
    });
    class qe {
        #t = !1;
        #e = null;
        #s = new Map;
        constructor(){
            this.onSetModified = null, this.onResetModified = null, this.onAnnotationEditor = null;
        }
        getValue(t, e) {
            const s = this.#s.get(t);
            return s === void 0 ? e : Object.assign(e, s);
        }
        getRawValue(t) {
            return this.#s.get(t);
        }
        remove(t) {
            if (this.#s.delete(t), this.#s.size === 0 && this.resetModified(), typeof this.onAnnotationEditor == "function") {
                for (const e of this.#s.values())if (e instanceof I) return;
                this.onAnnotationEditor(null);
            }
        }
        setValue(t, e) {
            const s = this.#s.get(t);
            let i = !1;
            if (s !== void 0) for (const [n, r] of Object.entries(e))s[n] !== r && (i = !0, s[n] = r);
            else i = !0, this.#s.set(t, e);
            i && this.#i(), e instanceof I && typeof this.onAnnotationEditor == "function" && this.onAnnotationEditor(e.constructor._type);
        }
        has(t) {
            return this.#s.has(t);
        }
        getAll() {
            return this.#s.size > 0 ? ze(this.#s) : null;
        }
        setAll(t) {
            for (const [e, s] of Object.entries(t))this.setValue(e, s);
        }
        get size() {
            return this.#s.size;
        }
        #i() {
            this.#t || (this.#t = !0, typeof this.onSetModified == "function" && this.onSetModified());
        }
        resetModified() {
            this.#t && (this.#t = !1, typeof this.onResetModified == "function" && this.onResetModified());
        }
        get print() {
            return new Rs(this);
        }
        get serializable() {
            if (this.#s.size === 0) return Ne;
            const t = new Map, e = new Ps, s = [], i = Object.create(null);
            let n = !1;
            for (const [r, a] of this.#s){
                const o = a instanceof I ? a.serialize(!1, i) : a;
                o && (t.set(r, o), e.update(`${r}:${JSON.stringify(o)}`), n ||= !!o.bitmap);
            }
            if (n) for (const r of t.values())r.bitmap && s.push(r.bitmap);
            return t.size > 0 ? {
                map: t,
                hash: e.hexdigest(),
                transfer: s
            } : Ne;
        }
        get editorStats() {
            let t = null;
            const e = new Map;
            for (const s of this.#s.values()){
                if (!(s instanceof I)) continue;
                const i = s.telemetryFinalData;
                if (!i) continue;
                const { type: n } = i;
                e.has(n) || e.set(n, Object.getPrototypeOf(s).constructor), t ||= Object.create(null);
                const r = t[n] ||= new Map;
                for (const [a, o] of Object.entries(i)){
                    if (a === "type") continue;
                    let l = r.get(a);
                    l || (l = new Map, r.set(a, l));
                    const h = l.get(o) ?? 0;
                    l.set(o, h + 1);
                }
            }
            for (const [s, i] of e)t[s] = i.computeTelemetryFinalData(t[s]);
            return t;
        }
        resetModifiedIds() {
            this.#e = null;
        }
        get modifiedIds() {
            if (this.#e) return this.#e;
            const t = [];
            for (const e of this.#s.values())!(e instanceof I) || !e.annotationElementId || !e.serialize() || t.push(e.annotationElementId);
            return this.#e = {
                ids: new Set(t),
                hash: t.join(",")
            };
        }
    }
    class Rs extends qe {
        #t;
        constructor(t){
            super();
            const { map: e, hash: s, transfer: i } = t.serializable, n = structuredClone(e, i ? {
                transfer: i
            } : null);
            this.#t = {
                map: n,
                hash: s,
                transfer: i
            };
        }
        get print() {
            V("Should not call PrintAnnotationStorage.print");
        }
        get serializable() {
            return this.#t;
        }
        get modifiedIds() {
            return O(this, "modifiedIds", {
                ids: new Set,
                hash: ""
            });
        }
    }
    class Li {
        #t = new Set;
        constructor({ ownerDocument: t = globalThis.document, styleElement: e = null }){
            this._document = t, this.nativeFontFaces = new Set, this.styleElement = null, this.loadingRequests = [], this.loadTestFontId = 0;
        }
        addNativeFontFace(t) {
            this.nativeFontFaces.add(t), this._document.fonts.add(t);
        }
        removeNativeFontFace(t) {
            this.nativeFontFaces.delete(t), this._document.fonts.delete(t);
        }
        insertRule(t) {
            this.styleElement || (this.styleElement = this._document.createElement("style"), this._document.documentElement.getElementsByTagName("head")[0].append(this.styleElement));
            const e = this.styleElement.sheet;
            e.insertRule(t, e.cssRules.length);
        }
        clear() {
            for (const t of this.nativeFontFaces)this._document.fonts.delete(t);
            this.nativeFontFaces.clear(), this.#t.clear(), this.styleElement && (this.styleElement.remove(), this.styleElement = null);
        }
        async loadSystemFont({ systemFontInfo: t, _inspectFont: e }) {
            if (!(!t || this.#t.has(t.loadedName))) {
                if (tt(!this.disableFontFace, "loadSystemFont shouldn't be called when `disableFontFace` is set."), this.isFontLoadingAPISupported) {
                    const { loadedName: s, src: i, style: n } = t, r = new FontFace(s, i, n);
                    this.addNativeFontFace(r);
                    try {
                        await r.load(), this.#t.add(s), e?.(t);
                    } catch  {
                        N(`Cannot load system font: ${t.baseFontName}, installing it could help to improve PDF rendering.`), this.removeNativeFontFace(r);
                    }
                    return;
                }
                V("Not implemented: loadSystemFont without the Font Loading API.");
            }
        }
        async bind(t) {
            if (t.attached || t.missingFile && !t.systemFontInfo) return;
            if (t.attached = !0, t.systemFontInfo) {
                await this.loadSystemFont(t);
                return;
            }
            if (this.isFontLoadingAPISupported) {
                const s = t.createNativeFontFace();
                if (s) {
                    this.addNativeFontFace(s);
                    try {
                        await s.loaded;
                    } catch (i) {
                        throw N(`Failed to load font '${s.family}': '${i}'.`), t.disableFontFace = !0, i;
                    }
                }
                return;
            }
            const e = t.createFontFaceRule();
            if (e) {
                if (this.insertRule(e), this.isSyncFontLoadingSupported) return;
                await new Promise((s)=>{
                    const i = this._queueLoadingCallback(s);
                    this._prepareFontLoadEvent(t, i);
                });
            }
        }
        get isFontLoadingAPISupported() {
            const t = !!this._document?.fonts;
            return O(this, "isFontLoadingAPISupported", t);
        }
        get isSyncFontLoadingSupported() {
            let t = !1;
            return (lt || typeof navigator < "u" && typeof navigator?.userAgent == "string" && /Mozilla\/5.0.*?rv:\d+.*? Gecko/.test(navigator.userAgent)) && (t = !0), O(this, "isSyncFontLoadingSupported", t);
        }
        _queueLoadingCallback(t) {
            function e() {
                for(tt(!i.done, "completeRequest() cannot be called twice."), i.done = !0; s.length > 0 && s[0].done;){
                    const n = s.shift();
                    setTimeout(n.callback, 0);
                }
            }
            const { loadingRequests: s } = this, i = {
                done: !1,
                complete: e,
                callback: t
            };
            return s.push(i), i;
        }
        get _loadTestFont() {
            const t = atob("T1RUTwALAIAAAwAwQ0ZGIDHtZg4AAAOYAAAAgUZGVE1lkzZwAAAEHAAAABxHREVGABQAFQAABDgAAAAeT1MvMlYNYwkAAAEgAAAAYGNtYXABDQLUAAACNAAAAUJoZWFk/xVFDQAAALwAAAA2aGhlYQdkA+oAAAD0AAAAJGhtdHgD6AAAAAAEWAAAAAZtYXhwAAJQAAAAARgAAAAGbmFtZVjmdH4AAAGAAAAAsXBvc3T/hgAzAAADeAAAACAAAQAAAAEAALZRFsRfDzz1AAsD6AAAAADOBOTLAAAAAM4KHDwAAAAAA+gDIQAAAAgAAgAAAAAAAAABAAADIQAAAFoD6AAAAAAD6AABAAAAAAAAAAAAAAAAAAAAAQAAUAAAAgAAAAQD6AH0AAUAAAKKArwAAACMAooCvAAAAeAAMQECAAACAAYJAAAAAAAAAAAAAQAAAAAAAAAAAAAAAFBmRWQAwAAuAC4DIP84AFoDIQAAAAAAAQAAAAAAAAAAACAAIAABAAAADgCuAAEAAAAAAAAAAQAAAAEAAAAAAAEAAQAAAAEAAAAAAAIAAQAAAAEAAAAAAAMAAQAAAAEAAAAAAAQAAQAAAAEAAAAAAAUAAQAAAAEAAAAAAAYAAQAAAAMAAQQJAAAAAgABAAMAAQQJAAEAAgABAAMAAQQJAAIAAgABAAMAAQQJAAMAAgABAAMAAQQJAAQAAgABAAMAAQQJAAUAAgABAAMAAQQJAAYAAgABWABYAAAAAAAAAwAAAAMAAAAcAAEAAAAAADwAAwABAAAAHAAEACAAAAAEAAQAAQAAAC7//wAAAC7////TAAEAAAAAAAABBgAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAD/gwAyAAAAAQAAAAAAAAAAAAAAAAAAAAABAAQEAAEBAQJYAAEBASH4DwD4GwHEAvgcA/gXBIwMAYuL+nz5tQXkD5j3CBLnEQACAQEBIVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYAAABAQAADwACAQEEE/t3Dov6fAH6fAT+fPp8+nwHDosMCvm1Cvm1DAz6fBQAAAAAAAABAAAAAMmJbzEAAAAAzgTjFQAAAADOBOQpAAEAAAAAAAAADAAUAAQAAAABAAAAAgABAAAAAAAAAAAD6AAAAAAAAA==");
            return O(this, "_loadTestFont", t);
        }
        _prepareFontLoadEvent(t, e) {
            function s(v, w) {
                return v.charCodeAt(w) << 24 | v.charCodeAt(w + 1) << 16 | v.charCodeAt(w + 2) << 8 | v.charCodeAt(w + 3) & 255;
            }
            function i(v, w, S, _) {
                const R = v.substring(0, w), M = v.substring(w + S);
                return R + _ + M;
            }
            let n, r;
            const a = this._document.createElement("canvas");
            a.width = 1, a.height = 1;
            const o = a.getContext("2d");
            let l = 0;
            function h(v, w) {
                if (++l > 30) {
                    N("Load test font never loaded."), w();
                    return;
                }
                if (o.font = "30px " + v, o.fillText(".", 0, 20), o.getImageData(0, 0, 1, 1).data[3] > 0) {
                    w();
                    return;
                }
                setTimeout(h.bind(null, v, w));
            }
            const d = `lt${Date.now()}${this.loadTestFontId++}`;
            let u = this._loadTestFont;
            u = i(u, 976, d.length, d);
            const p = 16, g = 1482184792;
            let b = s(u, p);
            for(n = 0, r = d.length - 3; n < r; n += 4)b = b - g + s(d, n) | 0;
            n < d.length && (b = b - g + s(d + "XXX", n) | 0), u = i(u, p, 4, Ai(b));
            const m = `url(data:font/opentype;base64,${btoa(u)});`, A = `@font-face {font-family:"${d}";src:${m}}`;
            this.insertRule(A);
            const y = this._document.createElement("div");
            y.style.visibility = "hidden", y.style.width = y.style.height = "10px", y.style.position = "absolute", y.style.top = y.style.left = "0px";
            for (const v of [
                t.loadedName,
                d
            ]){
                const w = this._document.createElement("span");
                w.textContent = "Hi", w.style.fontFamily = v, y.append(w);
            }
            this._document.body.append(y), h(d, ()=>{
                y.remove(), e.complete();
            });
        }
    }
    class Di {
        constructor(t, { disableFontFace: e = !1, fontExtraProperties: s = !1, inspectFont: i = null }){
            this.compiledGlyphs = Object.create(null);
            for(const n in t)this[n] = t[n];
            this.disableFontFace = e === !0, this.fontExtraProperties = s === !0, this._inspectFont = i;
        }
        createNativeFontFace() {
            if (!this.data || this.disableFontFace) return null;
            let t;
            if (!this.cssFontInfo) t = new FontFace(this.loadedName, this.data, {});
            else {
                const e = {
                    weight: this.cssFontInfo.fontWeight
                };
                this.cssFontInfo.italicAngle && (e.style = `oblique ${this.cssFontInfo.italicAngle}deg`), t = new FontFace(this.cssFontInfo.fontFamily, this.data, e);
            }
            return this._inspectFont?.(this), t;
        }
        createFontFaceRule() {
            if (!this.data || this.disableFontFace) return null;
            const t = `url(data:${this.mimetype};base64,${Ei(this.data)});`;
            let e;
            if (!this.cssFontInfo) e = `@font-face {font-family:"${this.loadedName}";src:${t}}`;
            else {
                let s = `font-weight: ${this.cssFontInfo.fontWeight};`;
                this.cssFontInfo.italicAngle && (s += `font-style: oblique ${this.cssFontInfo.italicAngle}deg;`), e = `@font-face {font-family:"${this.cssFontInfo.fontFamily}";${s}src:${t}}`;
            }
            return this._inspectFont?.(this, t), e;
        }
        getPathGenerator(t, e) {
            if (this.compiledGlyphs[e] !== void 0) return this.compiledGlyphs[e];
            const s = this.loadedName + "_path_" + e;
            let i;
            try {
                i = t.get(s);
            } catch (r) {
                N(`getPathGenerator - ignoring character: "${r}".`);
            }
            const n = new Path2D(i || "");
            return this.fontExtraProperties || t.delete(s), this.compiledGlyphs[e] = n;
        }
    }
    const le = {
        DATA: 1,
        ERROR: 2
    }, Z = {
        CANCEL: 1,
        CANCEL_COMPLETE: 2,
        CLOSE: 3,
        ENQUEUE: 4,
        ERROR: 5,
        PULL: 6,
        PULL_COMPLETE: 7,
        START_COMPLETE: 8
    };
    function cs() {}
    function ft(c) {
        if (c instanceof Lt || c instanceof De || c instanceof ee || c instanceof as || c instanceof fe || c instanceof Te) return c;
        switch(c instanceof Error || typeof c == "object" && c !== null || V('wrapReason: Expected "reason" to be a (possibly cloned) Error.'), c.name){
            case "AbortException":
                return new Lt(c.message);
            case "InvalidPDFException":
                return new De(c.message);
            case "MissingPDFException":
                return new ee(c.message);
            case "PasswordException":
                return new as(c.message, c.code);
            case "UnexpectedResponseException":
                return new fe(c.message, c.status);
            case "UnknownErrorException":
                return new Te(c.message, c.details);
        }
        return new Te(c.message, c.toString());
    }
    class Qt {
        #t = new AbortController;
        constructor(t, e, s){
            this.sourceName = t, this.targetName = e, this.comObj = s, this.callbackId = 1, this.streamId = 1, this.streamSinks = Object.create(null), this.streamControllers = Object.create(null), this.callbackCapabilities = Object.create(null), this.actionHandler = Object.create(null), s.addEventListener("message", this.#e.bind(this), {
                signal: this.#t.signal
            });
        }
        #e({ data: t }) {
            if (t.targetName !== this.sourceName) return;
            if (t.stream) {
                this.#i(t);
                return;
            }
            if (t.callback) {
                const s = t.callbackId, i = this.callbackCapabilities[s];
                if (!i) throw new Error(`Cannot resolve callback ${s}`);
                if (delete this.callbackCapabilities[s], t.callback === le.DATA) i.resolve(t.data);
                else if (t.callback === le.ERROR) i.reject(ft(t.reason));
                else throw new Error("Unexpected callback case");
                return;
            }
            const e = this.actionHandler[t.action];
            if (!e) throw new Error(`Unknown action from worker: ${t.action}`);
            if (t.callbackId) {
                const s = this.sourceName, i = t.sourceName, n = this.comObj;
                Promise.try(e, t.data).then(function(r) {
                    n.postMessage({
                        sourceName: s,
                        targetName: i,
                        callback: le.DATA,
                        callbackId: t.callbackId,
                        data: r
                    });
                }, function(r) {
                    n.postMessage({
                        sourceName: s,
                        targetName: i,
                        callback: le.ERROR,
                        callbackId: t.callbackId,
                        reason: ft(r)
                    });
                });
                return;
            }
            if (t.streamId) {
                this.#s(t);
                return;
            }
            e(t.data);
        }
        on(t, e) {
            const s = this.actionHandler;
            if (s[t]) throw new Error(`There is already an actionName called "${t}"`);
            s[t] = e;
        }
        send(t, e, s) {
            this.comObj.postMessage({
                sourceName: this.sourceName,
                targetName: this.targetName,
                action: t,
                data: e
            }, s);
        }
        sendWithPromise(t, e, s) {
            const i = this.callbackId++, n = Promise.withResolvers();
            this.callbackCapabilities[i] = n;
            try {
                this.comObj.postMessage({
                    sourceName: this.sourceName,
                    targetName: this.targetName,
                    action: t,
                    callbackId: i,
                    data: e
                }, s);
            } catch (r) {
                n.reject(r);
            }
            return n.promise;
        }
        sendWithStream(t, e, s, i) {
            const n = this.streamId++, r = this.sourceName, a = this.targetName, o = this.comObj;
            return new ReadableStream({
                start: (l)=>{
                    const h = Promise.withResolvers();
                    return this.streamControllers[n] = {
                        controller: l,
                        startCall: h,
                        pullCall: null,
                        cancelCall: null,
                        isClosed: !1
                    }, o.postMessage({
                        sourceName: r,
                        targetName: a,
                        action: t,
                        streamId: n,
                        data: e,
                        desiredSize: l.desiredSize
                    }, i), h.promise;
                },
                pull: (l)=>{
                    const h = Promise.withResolvers();
                    return this.streamControllers[n].pullCall = h, o.postMessage({
                        sourceName: r,
                        targetName: a,
                        stream: Z.PULL,
                        streamId: n,
                        desiredSize: l.desiredSize
                    }), h.promise;
                },
                cancel: (l)=>{
                    tt(l instanceof Error, "cancel must have a valid reason");
                    const h = Promise.withResolvers();
                    return this.streamControllers[n].cancelCall = h, this.streamControllers[n].isClosed = !0, o.postMessage({
                        sourceName: r,
                        targetName: a,
                        stream: Z.CANCEL,
                        streamId: n,
                        reason: ft(l)
                    }), h.promise;
                }
            }, s);
        }
        #s(t) {
            const e = t.streamId, s = this.sourceName, i = t.sourceName, n = this.comObj, r = this, a = this.actionHandler[t.action], o = {
                enqueue (l, h = 1, d) {
                    if (this.isCancelled) return;
                    const u = this.desiredSize;
                    this.desiredSize -= h, u > 0 && this.desiredSize <= 0 && (this.sinkCapability = Promise.withResolvers(), this.ready = this.sinkCapability.promise), n.postMessage({
                        sourceName: s,
                        targetName: i,
                        stream: Z.ENQUEUE,
                        streamId: e,
                        chunk: l
                    }, d);
                },
                close () {
                    this.isCancelled || (this.isCancelled = !0, n.postMessage({
                        sourceName: s,
                        targetName: i,
                        stream: Z.CLOSE,
                        streamId: e
                    }), delete r.streamSinks[e]);
                },
                error (l) {
                    tt(l instanceof Error, "error must have a valid reason"), !this.isCancelled && (this.isCancelled = !0, n.postMessage({
                        sourceName: s,
                        targetName: i,
                        stream: Z.ERROR,
                        streamId: e,
                        reason: ft(l)
                    }));
                },
                sinkCapability: Promise.withResolvers(),
                onPull: null,
                onCancel: null,
                isCancelled: !1,
                desiredSize: t.desiredSize,
                ready: null
            };
            o.sinkCapability.resolve(), o.ready = o.sinkCapability.promise, this.streamSinks[e] = o, Promise.try(a, t.data, o).then(function() {
                n.postMessage({
                    sourceName: s,
                    targetName: i,
                    stream: Z.START_COMPLETE,
                    streamId: e,
                    success: !0
                });
            }, function(l) {
                n.postMessage({
                    sourceName: s,
                    targetName: i,
                    stream: Z.START_COMPLETE,
                    streamId: e,
                    reason: ft(l)
                });
            });
        }
        #i(t) {
            const e = t.streamId, s = this.sourceName, i = t.sourceName, n = this.comObj, r = this.streamControllers[e], a = this.streamSinks[e];
            switch(t.stream){
                case Z.START_COMPLETE:
                    t.success ? r.startCall.resolve() : r.startCall.reject(ft(t.reason));
                    break;
                case Z.PULL_COMPLETE:
                    t.success ? r.pullCall.resolve() : r.pullCall.reject(ft(t.reason));
                    break;
                case Z.PULL:
                    if (!a) {
                        n.postMessage({
                            sourceName: s,
                            targetName: i,
                            stream: Z.PULL_COMPLETE,
                            streamId: e,
                            success: !0
                        });
                        break;
                    }
                    a.desiredSize <= 0 && t.desiredSize > 0 && a.sinkCapability.resolve(), a.desiredSize = t.desiredSize, Promise.try(a.onPull || cs).then(function() {
                        n.postMessage({
                            sourceName: s,
                            targetName: i,
                            stream: Z.PULL_COMPLETE,
                            streamId: e,
                            success: !0
                        });
                    }, function(l) {
                        n.postMessage({
                            sourceName: s,
                            targetName: i,
                            stream: Z.PULL_COMPLETE,
                            streamId: e,
                            reason: ft(l)
                        });
                    });
                    break;
                case Z.ENQUEUE:
                    if (tt(r, "enqueue should have stream controller"), r.isClosed) break;
                    r.controller.enqueue(t.chunk);
                    break;
                case Z.CLOSE:
                    if (tt(r, "close should have stream controller"), r.isClosed) break;
                    r.isClosed = !0, r.controller.close(), this.#r(r, e);
                    break;
                case Z.ERROR:
                    tt(r, "error should have stream controller"), r.controller.error(ft(t.reason)), this.#r(r, e);
                    break;
                case Z.CANCEL_COMPLETE:
                    t.success ? r.cancelCall.resolve() : r.cancelCall.reject(ft(t.reason)), this.#r(r, e);
                    break;
                case Z.CANCEL:
                    if (!a) break;
                    const o = ft(t.reason);
                    Promise.try(a.onCancel || cs, o).then(function() {
                        n.postMessage({
                            sourceName: s,
                            targetName: i,
                            stream: Z.CANCEL_COMPLETE,
                            streamId: e,
                            success: !0
                        });
                    }, function(l) {
                        n.postMessage({
                            sourceName: s,
                            targetName: i,
                            stream: Z.CANCEL_COMPLETE,
                            streamId: e,
                            reason: ft(l)
                        });
                    }), a.sinkCapability.reject(o), a.isCancelled = !0, delete this.streamSinks[e];
                    break;
                default:
                    throw new Error("Unexpected stream case");
            }
        }
        async #r(t, e) {
            await Promise.allSettled([
                t.startCall?.promise,
                t.pullCall?.promise,
                t.cancelCall?.promise
            ]), delete this.streamControllers[e];
        }
        destroy() {
            this.#t?.abort(), this.#t = null;
        }
    }
    class Ms {
        #t = !1;
        constructor({ enableHWA: t = !1 }){
            this.#t = t;
        }
        create(t, e) {
            if (t <= 0 || e <= 0) throw new Error("Invalid canvas size");
            const s = this._createCanvas(t, e);
            return {
                canvas: s,
                context: s.getContext("2d", {
                    willReadFrequently: !this.#t
                })
            };
        }
        reset(t, e, s) {
            if (!t.canvas) throw new Error("Canvas is not specified");
            if (e <= 0 || s <= 0) throw new Error("Invalid canvas size");
            t.canvas.width = e, t.canvas.height = s;
        }
        destroy(t) {
            if (!t.canvas) throw new Error("Canvas is not specified");
            t.canvas.width = 0, t.canvas.height = 0, t.canvas = null, t.context = null;
        }
        _createCanvas(t, e) {
            V("Abstract method `_createCanvas` called.");
        }
    }
    class Fi extends Ms {
        constructor({ ownerDocument: t = globalThis.document, enableHWA: e = !1 }){
            super({
                enableHWA: e
            }), this._document = t;
        }
        _createCanvas(t, e) {
            const s = this._document.createElement("canvas");
            return s.width = t, s.height = e, s;
        }
    }
    class ks {
        constructor({ baseUrl: t = null, isCompressed: e = !0 }){
            this.baseUrl = t, this.isCompressed = e;
        }
        async fetch({ name: t }) {
            if (!this.baseUrl) throw new Error("Ensure that the `cMapUrl` and `cMapPacked` API parameters are provided.");
            if (!t) throw new Error("CMap name must be specified.");
            const e = this.baseUrl + t + (this.isCompressed ? ".bcmap" : "");
            return this._fetch(e).then((s)=>({
                    cMapData: s,
                    isCompressed: this.isCompressed
                })).catch((s)=>{
                throw new Error(`Unable to load ${this.isCompressed ? "binary " : ""}CMap at: ${e}`);
            });
        }
        async _fetch(t) {
            V("Abstract method `_fetch` called.");
        }
    }
    class Is extends ks {
        async _fetch(t) {
            const e = await ye(t, this.isCompressed ? "arraybuffer" : "text");
            return e instanceof ArrayBuffer ? new Uint8Array(e) : Ae(e);
        }
    }
    class Ls {
        addFilter(t) {
            return "none";
        }
        addHCMFilter(t, e) {
            return "none";
        }
        addAlphaFilter(t) {
            return "none";
        }
        addLuminosityFilter(t) {
            return "none";
        }
        addHighlightHCMFilter(t, e, s, i, n) {
            return "none";
        }
        destroy(t = !1) {}
    }
    class Ni extends Ls {
        #t;
        #e;
        #s;
        #i;
        #r;
        #n;
        #l = 0;
        constructor({ docId: t, ownerDocument: e = globalThis.document }){
            super(), this.#i = t, this.#r = e;
        }
        get #o() {
            return this.#e ||= new Map;
        }
        get #c() {
            return this.#n ||= new Map;
        }
        get #h() {
            if (!this.#s) {
                const t = this.#r.createElement("div"), { style: e } = t;
                e.visibility = "hidden", e.contain = "strict", e.width = e.height = 0, e.position = "absolute", e.top = e.left = 0, e.zIndex = -1;
                const s = this.#r.createElementNS(Pt, "svg");
                s.setAttribute("width", 0), s.setAttribute("height", 0), this.#s = this.#r.createElementNS(Pt, "defs"), t.append(s), s.append(this.#s), this.#r.body.append(t);
            }
            return this.#s;
        }
        #u(t) {
            if (t.length === 1) {
                const o = t[0], l = new Array(256);
                for(let d = 0; d < 256; d++)l[d] = o[d] / 255;
                const h = l.join(",");
                return [
                    h,
                    h,
                    h
                ];
            }
            const [e, s, i] = t, n = new Array(256), r = new Array(256), a = new Array(256);
            for(let o = 0; o < 256; o++)n[o] = e[o] / 255, r[o] = s[o] / 255, a[o] = i[o] / 255;
            return [
                n.join(","),
                r.join(","),
                a.join(",")
            ];
        }
        #d(t) {
            if (this.#t === void 0) {
                this.#t = "";
                const e = this.#r.URL;
                e !== this.#r.baseURI && (ve(e) ? N('#createUrl: ignore "data:"-URL for performance reasons.') : this.#t = e.split("#", 1)[0]);
            }
            return `url(${this.#t}#${t})`;
        }
        addFilter(t) {
            if (!t) return "none";
            let e = this.#o.get(t);
            if (e) return e;
            const [s, i, n] = this.#u(t), r = t.length === 1 ? s : `${s}${i}${n}`;
            if (e = this.#o.get(r), e) return this.#o.set(t, e), e;
            const a = `g_${this.#i}_transfer_map_${this.#l++}`, o = this.#d(a);
            this.#o.set(t, o), this.#o.set(r, o);
            const l = this.#p(a);
            return this.#g(s, i, n, l), o;
        }
        addHCMFilter(t, e) {
            const s = `${t}-${e}`, i = "base";
            let n = this.#c.get(i);
            if (n?.key === s || (n ? (n.filter?.remove(), n.key = s, n.url = "none", n.filter = null) : (n = {
                key: s,
                url: "none",
                filter: null
            }, this.#c.set(i, n)), !t || !e)) return n.url;
            const r = this.#v(t);
            t = T.makeHexColor(...r);
            const a = this.#v(e);
            if (e = T.makeHexColor(...a), this.#h.style.color = "", t === "#000000" && e === "#ffffff" || t === e) return n.url;
            const o = new Array(256);
            for(let f = 0; f <= 255; f++){
                const p = f / 255;
                o[f] = p <= .03928 ? p / 12.92 : ((p + .055) / 1.055) ** 2.4;
            }
            const l = o.join(","), h = `g_${this.#i}_hcm_filter`, d = n.filter = this.#p(h);
            this.#g(l, l, l, d), this.#a(d);
            const u = (f, p)=>{
                const g = r[f] / 255, b = a[f] / 255, m = new Array(p + 1);
                for(let A = 0; A <= p; A++)m[A] = g + A / p * (b - g);
                return m.join(",");
            };
            return this.#g(u(0, 5), u(1, 5), u(2, 5), d), n.url = this.#d(h), n.url;
        }
        addAlphaFilter(t) {
            let e = this.#o.get(t);
            if (e) return e;
            const [s] = this.#u([
                t
            ]), i = `alpha_${s}`;
            if (e = this.#o.get(i), e) return this.#o.set(t, e), e;
            const n = `g_${this.#i}_alpha_map_${this.#l++}`, r = this.#d(n);
            this.#o.set(t, r), this.#o.set(i, r);
            const a = this.#p(n);
            return this.#b(s, a), r;
        }
        addLuminosityFilter(t) {
            let e = this.#o.get(t || "luminosity");
            if (e) return e;
            let s, i;
            if (t ? ([s] = this.#u([
                t
            ]), i = `luminosity_${s}`) : i = "luminosity", e = this.#o.get(i), e) return this.#o.set(t, e), e;
            const n = `g_${this.#i}_luminosity_map_${this.#l++}`, r = this.#d(n);
            this.#o.set(t, r), this.#o.set(i, r);
            const a = this.#p(n);
            return this.#f(a), t && this.#b(s, a), r;
        }
        addHighlightHCMFilter(t, e, s, i, n) {
            const r = `${e}-${s}-${i}-${n}`;
            let a = this.#c.get(t);
            if (a?.key === r || (a ? (a.filter?.remove(), a.key = r, a.url = "none", a.filter = null) : (a = {
                key: r,
                url: "none",
                filter: null
            }, this.#c.set(t, a)), !e || !s)) return a.url;
            const [o, l] = [
                e,
                s
            ].map(this.#v.bind(this));
            let h = Math.round(.2126 * o[0] + .7152 * o[1] + .0722 * o[2]), d = Math.round(.2126 * l[0] + .7152 * l[1] + .0722 * l[2]), [u, f] = [
                i,
                n
            ].map(this.#v.bind(this));
            d < h && ([h, d, u, f] = [
                d,
                h,
                f,
                u
            ]), this.#h.style.color = "";
            const p = (m, A, y)=>{
                const v = new Array(256), w = (d - h) / y, S = m / 255, _ = (A - m) / (255 * y);
                let R = 0;
                for(let M = 0; M <= y; M++){
                    const $ = Math.round(h + M * w), D = S + M * _;
                    for(let j = R; j <= $; j++)v[j] = D;
                    R = $ + 1;
                }
                for(let M = R; M < 256; M++)v[M] = v[R - 1];
                return v.join(",");
            }, g = `g_${this.#i}_hcm_${t}_filter`, b = a.filter = this.#p(g);
            return this.#a(b), this.#g(p(u[0], f[0], 5), p(u[1], f[1], 5), p(u[2], f[2], 5), b), a.url = this.#d(g), a.url;
        }
        destroy(t = !1) {
            t && this.#n?.size || (this.#s?.parentNode.parentNode.remove(), this.#s = null, this.#e?.clear(), this.#e = null, this.#n?.clear(), this.#n = null, this.#l = 0);
        }
        #f(t) {
            const e = this.#r.createElementNS(Pt, "feColorMatrix");
            e.setAttribute("type", "matrix"), e.setAttribute("values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0.59 0.11 0 0"), t.append(e);
        }
        #a(t) {
            const e = this.#r.createElementNS(Pt, "feColorMatrix");
            e.setAttribute("type", "matrix"), e.setAttribute("values", "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"), t.append(e);
        }
        #p(t) {
            const e = this.#r.createElementNS(Pt, "filter");
            return e.setAttribute("color-interpolation-filters", "sRGB"), e.setAttribute("id", t), this.#h.append(e), e;
        }
        #m(t, e, s) {
            const i = this.#r.createElementNS(Pt, e);
            i.setAttribute("type", "discrete"), i.setAttribute("tableValues", s), t.append(i);
        }
        #g(t, e, s, i) {
            const n = this.#r.createElementNS(Pt, "feComponentTransfer");
            i.append(n), this.#m(n, "feFuncR", t), this.#m(n, "feFuncG", e), this.#m(n, "feFuncB", s);
        }
        #b(t, e) {
            const s = this.#r.createElementNS(Pt, "feComponentTransfer");
            e.append(s), this.#m(s, "feFuncA", t);
        }
        #v(t) {
            return this.#h.style.color = t, Ve(getComputedStyle(this.#h).getPropertyValue("color"));
        }
    }
    class Ds {
        constructor({ baseUrl: t = null }){
            this.baseUrl = t;
        }
        async fetch({ filename: t }) {
            if (!this.baseUrl) throw new Error("Ensure that the `standardFontDataUrl` API parameter is provided.");
            if (!t) throw new Error("Font filename must be specified.");
            const e = `${this.baseUrl}${t}`;
            return this._fetch(e).catch((s)=>{
                throw new Error(`Unable to load font data at: ${e}`);
            });
        }
        async _fetch(t) {
            V("Abstract method `_fetch` called.");
        }
    }
    class Fs extends Ds {
        async _fetch(t) {
            const e = await ye(t, "arraybuffer");
            return new Uint8Array(e);
        }
    }
    lt && N("Please use the `legacy` build in Node.js environments.");
    async function Ns(c) {
        const e = await process.getBuiltinModule("fs").promises.readFile(c);
        return new Uint8Array(e);
    }
    class Oi extends Ls {
    }
    class Bi extends Ms {
        _createCanvas(t, e) {
            return process.getBuiltinModule("module").createRequire(import.meta.url)("@napi-rs/canvas").createCanvas(t, e);
        }
    }
    class Hi extends ks {
        async _fetch(t) {
            return Ns(t);
        }
    }
    class $i extends Ds {
        async _fetch(t) {
            return Ns(t);
        }
    }
    const ot = {
        FILL: "Fill",
        STROKE: "Stroke",
        SHADING: "Shading"
    };
    function Oe(c, t) {
        if (!t) return;
        const e = t[2] - t[0], s = t[3] - t[1], i = new Path2D;
        i.rect(t[0], t[1], e, s), c.clip(i);
    }
    class Ye {
        getPattern() {
            V("Abstract method `getPattern` called.");
        }
    }
    class zi extends Ye {
        constructor(t){
            super(), this._type = t[1], this._bbox = t[2], this._colorStops = t[3], this._p0 = t[4], this._p1 = t[5], this._r0 = t[6], this._r1 = t[7], this.matrix = null;
        }
        _createGradient(t) {
            let e;
            this._type === "axial" ? e = t.createLinearGradient(this._p0[0], this._p0[1], this._p1[0], this._p1[1]) : this._type === "radial" && (e = t.createRadialGradient(this._p0[0], this._p0[1], this._r0, this._p1[0], this._p1[1], this._r1));
            for (const s of this._colorStops)e.addColorStop(s[0], s[1]);
            return e;
        }
        getPattern(t, e, s, i) {
            let n;
            if (i === ot.STROKE || i === ot.FILL) {
                const r = e.current.getClippedPathBoundingBox(i, q(t)) || [
                    0,
                    0,
                    0,
                    0
                ], a = Math.ceil(r[2] - r[0]) || 1, o = Math.ceil(r[3] - r[1]) || 1, l = e.cachedCanvases.getCanvas("pattern", a, o), h = l.context;
                h.clearRect(0, 0, h.canvas.width, h.canvas.height), h.beginPath(), h.rect(0, 0, h.canvas.width, h.canvas.height), h.translate(-r[0], -r[1]), s = T.transform(s, [
                    1,
                    0,
                    0,
                    1,
                    r[0],
                    r[1]
                ]), h.transform(...e.baseTransform), this.matrix && h.transform(...this.matrix), Oe(h, this._bbox), h.fillStyle = this._createGradient(h), h.fill(), n = t.createPattern(l.canvas, "no-repeat");
                const d = new DOMMatrix(s);
                n.setTransform(d);
            } else Oe(t, this._bbox), n = this._createGradient(t);
            return n;
        }
    }
    function Me(c, t, e, s, i, n, r, a) {
        const o = t.coords, l = t.colors, h = c.data, d = c.width * 4;
        let u;
        o[e + 1] > o[s + 1] && (u = e, e = s, s = u, u = n, n = r, r = u), o[s + 1] > o[i + 1] && (u = s, s = i, i = u, u = r, r = a, a = u), o[e + 1] > o[s + 1] && (u = e, e = s, s = u, u = n, n = r, r = u);
        const f = (o[e] + t.offsetX) * t.scaleX, p = (o[e + 1] + t.offsetY) * t.scaleY, g = (o[s] + t.offsetX) * t.scaleX, b = (o[s + 1] + t.offsetY) * t.scaleY, m = (o[i] + t.offsetX) * t.scaleX, A = (o[i + 1] + t.offsetY) * t.scaleY;
        if (p >= A) return;
        const y = l[n], v = l[n + 1], w = l[n + 2], S = l[r], _ = l[r + 1], R = l[r + 2], M = l[a], $ = l[a + 1], D = l[a + 2], j = Math.round(p), K = Math.round(A);
        let P, B, E, x, z, Y, et, G;
        for(let X = j; X <= K; X++){
            if (X < b) {
                const U = X < p ? 0 : (p - X) / (p - b);
                P = f - (f - g) * U, B = y - (y - S) * U, E = v - (v - _) * U, x = w - (w - R) * U;
            } else {
                let U;
                X > A ? U = 1 : b === A ? U = 0 : U = (b - X) / (b - A), P = g - (g - m) * U, B = S - (S - M) * U, E = _ - (_ - $) * U, x = R - (R - D) * U;
            }
            let W;
            X < p ? W = 0 : X > A ? W = 1 : W = (p - X) / (p - A), z = f - (f - m) * W, Y = y - (y - M) * W, et = v - (v - $) * W, G = w - (w - D) * W;
            const Ct = Math.round(Math.min(P, z)), vt = Math.round(Math.max(P, z));
            let rt = d * X + Ct * 4;
            for(let U = Ct; U <= vt; U++)W = (P - U) / (P - z), W < 0 ? W = 0 : W > 1 && (W = 1), h[rt++] = B - (B - Y) * W | 0, h[rt++] = E - (E - et) * W | 0, h[rt++] = x - (x - G) * W | 0, h[rt++] = 255;
        }
    }
    function Gi(c, t, e) {
        const s = t.coords, i = t.colors;
        let n, r;
        switch(t.type){
            case "lattice":
                const a = t.verticesPerRow, o = Math.floor(s.length / a) - 1, l = a - 1;
                for(n = 0; n < o; n++){
                    let h = n * a;
                    for(let d = 0; d < l; d++, h++)Me(c, e, s[h], s[h + 1], s[h + a], i[h], i[h + 1], i[h + a]), Me(c, e, s[h + a + 1], s[h + 1], s[h + a], i[h + a + 1], i[h + 1], i[h + a]);
                }
                break;
            case "triangles":
                for(n = 0, r = s.length; n < r; n += 3)Me(c, e, s[n], s[n + 1], s[n + 2], i[n], i[n + 1], i[n + 2]);
                break;
            default:
                throw new Error("illegal figure");
        }
    }
    class ji extends Ye {
        constructor(t){
            super(), this._coords = t[2], this._colors = t[3], this._figures = t[4], this._bounds = t[5], this._bbox = t[7], this._background = t[8], this.matrix = null;
        }
        _createMeshCanvas(t, e, s) {
            const a = Math.floor(this._bounds[0]), o = Math.floor(this._bounds[1]), l = Math.ceil(this._bounds[2]) - a, h = Math.ceil(this._bounds[3]) - o, d = Math.min(Math.ceil(Math.abs(l * t[0] * 1.1)), 3e3), u = Math.min(Math.ceil(Math.abs(h * t[1] * 1.1)), 3e3), f = l / d, p = h / u, g = {
                coords: this._coords,
                colors: this._colors,
                offsetX: -a,
                offsetY: -o,
                scaleX: 1 / f,
                scaleY: 1 / p
            }, b = d + 4, m = u + 4, A = s.getCanvas("mesh", b, m), y = A.context, v = y.createImageData(d, u);
            if (e) {
                const S = v.data;
                for(let _ = 0, R = S.length; _ < R; _ += 4)S[_] = e[0], S[_ + 1] = e[1], S[_ + 2] = e[2], S[_ + 3] = 255;
            }
            for (const S of this._figures)Gi(v, S, g);
            return y.putImageData(v, 2, 2), {
                canvas: A.canvas,
                offsetX: a - 2 * f,
                offsetY: o - 2 * p,
                scaleX: f,
                scaleY: p
            };
        }
        getPattern(t, e, s, i) {
            Oe(t, this._bbox);
            let n;
            if (i === ot.SHADING) n = T.singularValueDecompose2dScale(q(t));
            else if (n = T.singularValueDecompose2dScale(e.baseTransform), this.matrix) {
                const a = T.singularValueDecompose2dScale(this.matrix);
                n = [
                    n[0] * a[0],
                    n[1] * a[1]
                ];
            }
            const r = this._createMeshCanvas(n, i === ot.SHADING ? null : this._background, e.cachedCanvases);
            return i !== ot.SHADING && (t.setTransform(...e.baseTransform), this.matrix && t.transform(...this.matrix)), t.translate(r.offsetX, r.offsetY), t.scale(r.scaleX, r.scaleY), t.createPattern(r.canvas, "no-repeat");
        }
    }
    class Ui extends Ye {
        getPattern() {
            return "hotpink";
        }
    }
    function Vi(c) {
        switch(c[0]){
            case "RadialAxial":
                return new zi(c);
            case "Mesh":
                return new ji(c);
            case "Dummy":
                return new Ui;
        }
        throw new Error(`Unknown IR type: ${c[0]}`);
    }
    const ds = {
        COLORED: 1,
        UNCOLORED: 2
    };
    class Ke {
        static MAX_PATTERN_SIZE = 3e3;
        constructor(t, e, s, i, n){
            this.operatorList = t[2], this.matrix = t[3], this.bbox = t[4], this.xstep = t[5], this.ystep = t[6], this.paintType = t[7], this.tilingType = t[8], this.color = e, this.ctx = s, this.canvasGraphicsFactory = i, this.baseTransform = n;
        }
        createPatternCanvas(t) {
            const { bbox: e, operatorList: s, paintType: i, tilingType: n, color: r, canvasGraphicsFactory: a } = this;
            let { xstep: o, ystep: l } = this;
            o = Math.abs(o), l = Math.abs(l), be("TilingType: " + n);
            const h = e[0], d = e[1], u = e[2], f = e[3], p = u - h, g = f - d, b = T.singularValueDecompose2dScale(this.matrix), m = T.singularValueDecompose2dScale(this.baseTransform), A = b[0] * m[0], y = b[1] * m[1];
            let v = p, w = g, S = !1, _ = !1;
            const R = Math.ceil(o * A), M = Math.ceil(l * y), $ = Math.ceil(p * A), D = Math.ceil(g * y);
            R >= $ ? v = o : S = !0, M >= D ? w = l : _ = !0;
            const j = this.getSizeAndScale(v, this.ctx.canvas.width, A), K = this.getSizeAndScale(w, this.ctx.canvas.height, y), P = t.cachedCanvases.getCanvas("pattern", j.size, K.size), B = P.context, E = a.createCanvasGraphics(B);
            if (E.groupLevel = t.groupLevel, this.setFillAndStrokeStyleToContext(E, i, r), B.translate(-j.scale * h, -K.scale * d), E.transform(j.scale, 0, 0, K.scale, 0, 0), B.save(), this.clipBbox(E, h, d, u, f), E.baseTransform = q(E.ctx), E.executeOperatorList(s), E.endDrawing(), B.restore(), S || _) {
                const x = P.canvas;
                S && (v = o), _ && (w = l);
                const z = this.getSizeAndScale(v, this.ctx.canvas.width, A), Y = this.getSizeAndScale(w, this.ctx.canvas.height, y), et = z.size, G = Y.size, X = t.cachedCanvases.getCanvas("pattern-workaround", et, G), W = X.context, Ct = S ? Math.floor(p / o) : 0, vt = _ ? Math.floor(g / l) : 0;
                for(let rt = 0; rt <= Ct; rt++)for(let U = 0; U <= vt; U++)W.drawImage(x, et * rt, G * U, et, G, 0, 0, et, G);
                return {
                    canvas: X.canvas,
                    scaleX: z.scale,
                    scaleY: Y.scale,
                    offsetX: h,
                    offsetY: d
                };
            }
            return {
                canvas: P.canvas,
                scaleX: j.scale,
                scaleY: K.scale,
                offsetX: h,
                offsetY: d
            };
        }
        getSizeAndScale(t, e, s) {
            const i = Math.max(Ke.MAX_PATTERN_SIZE, e);
            let n = Math.ceil(t * s);
            return n >= i ? n = i : s = n / t, {
                scale: s,
                size: n
            };
        }
        clipBbox(t, e, s, i, n) {
            const r = i - e, a = n - s;
            t.ctx.rect(e, s, r, a), t.current.updateRectMinMax(q(t.ctx), [
                e,
                s,
                i,
                n
            ]), t.clip(), t.endPath();
        }
        setFillAndStrokeStyleToContext(t, e, s) {
            const i = t.ctx, n = t.current;
            switch(e){
                case ds.COLORED:
                    const r = this.ctx;
                    i.fillStyle = r.fillStyle, i.strokeStyle = r.strokeStyle, n.fillColor = r.fillStyle, n.strokeColor = r.strokeStyle;
                    break;
                case ds.UNCOLORED:
                    const a = T.makeHexColor(s[0], s[1], s[2]);
                    i.fillStyle = a, i.strokeStyle = a, n.fillColor = a, n.strokeColor = a;
                    break;
                default:
                    throw new bi(`Unsupported paint type: ${e}`);
            }
        }
        getPattern(t, e, s, i) {
            let n = s;
            i !== ot.SHADING && (n = T.transform(n, e.baseTransform), this.matrix && (n = T.transform(n, this.matrix)));
            const r = this.createPatternCanvas(e);
            let a = new DOMMatrix(n);
            a = a.translate(r.offsetX, r.offsetY), a = a.scale(1 / r.scaleX, 1 / r.scaleY);
            const o = t.createPattern(r.canvas, "repeat");
            return o.setTransform(a), o;
        }
    }
    function Wi({ src: c, srcPos: t = 0, dest: e, width: s, height: i, nonBlackColor: n = 4294967295, inverseDecode: r = !1 }) {
        const a = dt.isLittleEndian ? 4278190080 : 255, [o, l] = r ? [
            n,
            a
        ] : [
            a,
            n
        ], h = s >> 3, d = s & 7, u = c.length;
        e = new Uint32Array(e.buffer);
        let f = 0;
        for(let p = 0; p < i; p++){
            for(const b = t + h; t < b; t++){
                const m = t < u ? c[t] : 255;
                e[f++] = m & 128 ? l : o, e[f++] = m & 64 ? l : o, e[f++] = m & 32 ? l : o, e[f++] = m & 16 ? l : o, e[f++] = m & 8 ? l : o, e[f++] = m & 4 ? l : o, e[f++] = m & 2 ? l : o, e[f++] = m & 1 ? l : o;
            }
            if (d === 0) continue;
            const g = t < u ? c[t++] : 255;
            for(let b = 0; b < d; b++)e[f++] = g & 1 << 7 - b ? l : o;
        }
        return {
            srcPos: t,
            destPos: f
        };
    }
    const us = 16, fs = 100, Xi = 15, ps = 10, gs = 1e3, pt = 16;
    function qi(c, t) {
        if (c._removeMirroring) throw new Error("Context is already forwarding operations.");
        c.__originalSave = c.save, c.__originalRestore = c.restore, c.__originalRotate = c.rotate, c.__originalScale = c.scale, c.__originalTranslate = c.translate, c.__originalTransform = c.transform, c.__originalSetTransform = c.setTransform, c.__originalResetTransform = c.resetTransform, c.__originalClip = c.clip, c.__originalMoveTo = c.moveTo, c.__originalLineTo = c.lineTo, c.__originalBezierCurveTo = c.bezierCurveTo, c.__originalRect = c.rect, c.__originalClosePath = c.closePath, c.__originalBeginPath = c.beginPath, c._removeMirroring = ()=>{
            c.save = c.__originalSave, c.restore = c.__originalRestore, c.rotate = c.__originalRotate, c.scale = c.__originalScale, c.translate = c.__originalTranslate, c.transform = c.__originalTransform, c.setTransform = c.__originalSetTransform, c.resetTransform = c.__originalResetTransform, c.clip = c.__originalClip, c.moveTo = c.__originalMoveTo, c.lineTo = c.__originalLineTo, c.bezierCurveTo = c.__originalBezierCurveTo, c.rect = c.__originalRect, c.closePath = c.__originalClosePath, c.beginPath = c.__originalBeginPath, delete c._removeMirroring;
        }, c.save = function() {
            t.save(), this.__originalSave();
        }, c.restore = function() {
            t.restore(), this.__originalRestore();
        }, c.translate = function(s, i) {
            t.translate(s, i), this.__originalTranslate(s, i);
        }, c.scale = function(s, i) {
            t.scale(s, i), this.__originalScale(s, i);
        }, c.transform = function(s, i, n, r, a, o) {
            t.transform(s, i, n, r, a, o), this.__originalTransform(s, i, n, r, a, o);
        }, c.setTransform = function(s, i, n, r, a, o) {
            t.setTransform(s, i, n, r, a, o), this.__originalSetTransform(s, i, n, r, a, o);
        }, c.resetTransform = function() {
            t.resetTransform(), this.__originalResetTransform();
        }, c.rotate = function(s) {
            t.rotate(s), this.__originalRotate(s);
        }, c.clip = function(s) {
            t.clip(s), this.__originalClip(s);
        }, c.moveTo = function(e, s) {
            t.moveTo(e, s), this.__originalMoveTo(e, s);
        }, c.lineTo = function(e, s) {
            t.lineTo(e, s), this.__originalLineTo(e, s);
        }, c.bezierCurveTo = function(e, s, i, n, r, a) {
            t.bezierCurveTo(e, s, i, n, r, a), this.__originalBezierCurveTo(e, s, i, n, r, a);
        }, c.rect = function(e, s, i, n) {
            t.rect(e, s, i, n), this.__originalRect(e, s, i, n);
        }, c.closePath = function() {
            t.closePath(), this.__originalClosePath();
        }, c.beginPath = function() {
            t.beginPath(), this.__originalBeginPath();
        };
    }
    class Yi {
        constructor(t){
            this.canvasFactory = t, this.cache = Object.create(null);
        }
        getCanvas(t, e, s) {
            let i;
            return this.cache[t] !== void 0 ? (i = this.cache[t], this.canvasFactory.reset(i, e, s)) : (i = this.canvasFactory.create(e, s), this.cache[t] = i), i;
        }
        delete(t) {
            delete this.cache[t];
        }
        clear() {
            for(const t in this.cache){
                const e = this.cache[t];
                this.canvasFactory.destroy(e), delete this.cache[t];
            }
        }
    }
    function he(c, t, e, s, i, n, r, a, o, l) {
        const [h, d, u, f, p, g] = q(c);
        if (d === 0 && u === 0) {
            const A = r * h + p, y = Math.round(A), v = a * f + g, w = Math.round(v), S = (r + o) * h + p, _ = Math.abs(Math.round(S) - y) || 1, R = (a + l) * f + g, M = Math.abs(Math.round(R) - w) || 1;
            return c.setTransform(Math.sign(h), 0, 0, Math.sign(f), y, w), c.drawImage(t, e, s, i, n, 0, 0, _, M), c.setTransform(h, d, u, f, p, g), [
                _,
                M
            ];
        }
        if (h === 0 && f === 0) {
            const A = a * u + p, y = Math.round(A), v = r * d + g, w = Math.round(v), S = (a + l) * u + p, _ = Math.abs(Math.round(S) - y) || 1, R = (r + o) * d + g, M = Math.abs(Math.round(R) - w) || 1;
            return c.setTransform(0, Math.sign(d), Math.sign(u), 0, y, w), c.drawImage(t, e, s, i, n, 0, 0, M, _), c.setTransform(h, d, u, f, p, g), [
                M,
                _
            ];
        }
        c.drawImage(t, e, s, i, n, r, a, o, l);
        const b = Math.hypot(h, d), m = Math.hypot(u, f);
        return [
            b * o,
            m * l
        ];
    }
    function Ki(c) {
        const { width: t, height: e } = c;
        if (t > gs || e > gs) return null;
        const s = 1e3, i = new Uint8Array([
            0,
            2,
            4,
            0,
            1,
            0,
            5,
            4,
            8,
            10,
            0,
            8,
            0,
            2,
            1,
            0
        ]), n = t + 1;
        let r = new Uint8Array(n * (e + 1)), a, o, l;
        const h = t + 7 & -8;
        let d = new Uint8Array(h * e), u = 0;
        for (const m of c.data){
            let A = 128;
            for(; A > 0;)d[u++] = m & A ? 0 : 255, A >>= 1;
        }
        let f = 0;
        for(u = 0, d[u] !== 0 && (r[0] = 1, ++f), o = 1; o < t; o++)d[u] !== d[u + 1] && (r[o] = d[u] ? 2 : 1, ++f), u++;
        for(d[u] !== 0 && (r[o] = 2, ++f), a = 1; a < e; a++){
            u = a * h, l = a * n, d[u - h] !== d[u] && (r[l] = d[u] ? 1 : 8, ++f);
            let m = (d[u] ? 4 : 0) + (d[u - h] ? 8 : 0);
            for(o = 1; o < t; o++)m = (m >> 2) + (d[u + 1] ? 4 : 0) + (d[u - h + 1] ? 8 : 0), i[m] && (r[l + o] = i[m], ++f), u++;
            if (d[u - h] !== d[u] && (r[l + o] = d[u] ? 2 : 4, ++f), f > s) return null;
        }
        for(u = h * (e - 1), l = a * n, d[u] !== 0 && (r[l] = 8, ++f), o = 1; o < t; o++)d[u] !== d[u + 1] && (r[l + o] = d[u] ? 4 : 8, ++f), u++;
        if (d[u] !== 0 && (r[l + o] = 4, ++f), f > s) return null;
        const p = new Int32Array([
            0,
            n,
            -1,
            0,
            -n,
            0,
            0,
            0,
            1
        ]), g = new Path2D;
        for(a = 0; f && a <= e; a++){
            let m = a * n;
            const A = m + t;
            for(; m < A && !r[m];)m++;
            if (m === A) continue;
            g.moveTo(m % n, a);
            const y = m;
            let v = r[m];
            do {
                const w = p[v];
                do m += w;
                while (!r[m]);
                const S = r[m];
                S !== 5 && S !== 10 ? (v = S, r[m] = 0) : (v = S & 51 * v >> 4, r[m] &= v >> 2 | v << 2), g.lineTo(m % n, m / n | 0), r[m] || --f;
            }while (y !== m);
            --a;
        }
        return d = null, r = null, function(m) {
            m.save(), m.scale(1 / t, -1 / e), m.translate(0, -e), m.fill(g), m.beginPath(), m.restore();
        };
    }
    class ms {
        constructor(t, e){
            this.alphaIsShape = !1, this.fontSize = 0, this.fontSizeScale = 1, this.textMatrix = xs, this.textMatrixScale = 1, this.fontMatrix = Le, this.leading = 0, this.x = 0, this.y = 0, this.lineX = 0, this.lineY = 0, this.charSpacing = 0, this.wordSpacing = 0, this.textHScale = 1, this.textRenderingMode = at.FILL, this.textRise = 0, this.fillColor = "#000000", this.strokeColor = "#000000", this.patternFill = !1, this.patternStroke = !1, this.fillAlpha = 1, this.strokeAlpha = 1, this.lineWidth = 1, this.activeSMask = null, this.transferMaps = "none", this.startNewPathAndClipBox([
                0,
                0,
                t,
                e
            ]);
        }
        clone() {
            const t = Object.create(this);
            return t.clipBox = this.clipBox.slice(), t;
        }
        setCurrentPoint(t, e) {
            this.x = t, this.y = e;
        }
        updatePathMinMax(t, e, s) {
            [e, s] = T.applyTransform([
                e,
                s
            ], t), this.minX = Math.min(this.minX, e), this.minY = Math.min(this.minY, s), this.maxX = Math.max(this.maxX, e), this.maxY = Math.max(this.maxY, s);
        }
        updateRectMinMax(t, e) {
            const s = T.applyTransform(e, t), i = T.applyTransform(e.slice(2), t), n = T.applyTransform([
                e[0],
                e[3]
            ], t), r = T.applyTransform([
                e[2],
                e[1]
            ], t);
            this.minX = Math.min(this.minX, s[0], i[0], n[0], r[0]), this.minY = Math.min(this.minY, s[1], i[1], n[1], r[1]), this.maxX = Math.max(this.maxX, s[0], i[0], n[0], r[0]), this.maxY = Math.max(this.maxY, s[1], i[1], n[1], r[1]);
        }
        updateScalingPathMinMax(t, e) {
            T.scaleMinMax(t, e), this.minX = Math.min(this.minX, e[0]), this.minY = Math.min(this.minY, e[1]), this.maxX = Math.max(this.maxX, e[2]), this.maxY = Math.max(this.maxY, e[3]);
        }
        updateCurvePathMinMax(t, e, s, i, n, r, a, o, l, h) {
            const d = T.bezierBoundingBox(e, s, i, n, r, a, o, l, h);
            h || this.updateRectMinMax(t, d);
        }
        getPathBoundingBox(t = ot.FILL, e = null) {
            const s = [
                this.minX,
                this.minY,
                this.maxX,
                this.maxY
            ];
            if (t === ot.STROKE) {
                e || V("Stroke bounding box must include transform.");
                const i = T.singularValueDecompose2dScale(e), n = i[0] * this.lineWidth / 2, r = i[1] * this.lineWidth / 2;
                s[0] -= n, s[1] -= r, s[2] += n, s[3] += r;
            }
            return s;
        }
        updateClipFromPath() {
            const t = T.intersect(this.clipBox, this.getPathBoundingBox());
            this.startNewPathAndClipBox(t || [
                0,
                0,
                0,
                0
            ]);
        }
        isEmptyClip() {
            return this.minX === 1 / 0;
        }
        startNewPathAndClipBox(t) {
            this.clipBox = t, this.minX = 1 / 0, this.minY = 1 / 0, this.maxX = 0, this.maxY = 0;
        }
        getClippedPathBoundingBox(t = ot.FILL, e = null) {
            return T.intersect(this.clipBox, this.getPathBoundingBox(t, e));
        }
    }
    function bs(c, t) {
        if (t instanceof ImageData) {
            c.putImageData(t, 0, 0);
            return;
        }
        const e = t.height, s = t.width, i = e % pt, n = (e - i) / pt, r = i === 0 ? n : n + 1, a = c.createImageData(s, pt);
        let o = 0, l;
        const h = t.data, d = a.data;
        let u, f, p, g;
        if (t.kind === ue.GRAYSCALE_1BPP) {
            const b = h.byteLength, m = new Uint32Array(d.buffer, 0, d.byteLength >> 2), A = m.length, y = s + 7 >> 3, v = 4294967295, w = dt.isLittleEndian ? 4278190080 : 255;
            for(u = 0; u < r; u++){
                for(p = u < n ? pt : i, l = 0, f = 0; f < p; f++){
                    const S = b - o;
                    let _ = 0;
                    const R = S > y ? s : S * 8 - 7, M = R & -8;
                    let $ = 0, D = 0;
                    for(; _ < M; _ += 8)D = h[o++], m[l++] = D & 128 ? v : w, m[l++] = D & 64 ? v : w, m[l++] = D & 32 ? v : w, m[l++] = D & 16 ? v : w, m[l++] = D & 8 ? v : w, m[l++] = D & 4 ? v : w, m[l++] = D & 2 ? v : w, m[l++] = D & 1 ? v : w;
                    for(; _ < R; _++)$ === 0 && (D = h[o++], $ = 128), m[l++] = D & $ ? v : w, $ >>= 1;
                }
                for(; l < A;)m[l++] = 0;
                c.putImageData(a, 0, u * pt);
            }
        } else if (t.kind === ue.RGBA_32BPP) {
            for(f = 0, g = s * pt * 4, u = 0; u < n; u++)d.set(h.subarray(o, o + g)), o += g, c.putImageData(a, 0, f), f += pt;
            u < r && (g = s * i * 4, d.set(h.subarray(o, o + g)), c.putImageData(a, 0, f));
        } else if (t.kind === ue.RGB_24BPP) for(p = pt, g = s * p, u = 0; u < r; u++){
            for(u >= n && (p = i, g = s * p), l = 0, f = g; f--;)d[l++] = h[o++], d[l++] = h[o++], d[l++] = h[o++], d[l++] = 255;
            c.putImageData(a, 0, u * pt);
        }
        else throw new Error(`bad image kind: ${t.kind}`);
    }
    function As(c, t) {
        if (t.bitmap) {
            c.drawImage(t.bitmap, 0, 0);
            return;
        }
        const e = t.height, s = t.width, i = e % pt, n = (e - i) / pt, r = i === 0 ? n : n + 1, a = c.createImageData(s, pt);
        let o = 0;
        const l = t.data, h = a.data;
        for(let d = 0; d < r; d++){
            const u = d < n ? pt : i;
            ({ srcPos: o } = Wi({
                src: l,
                srcPos: o,
                dest: h,
                width: s,
                height: u,
                nonBlackColor: 0
            })), c.putImageData(a, 0, d * pt);
        }
    }
    function Xt(c, t) {
        const e = [
            "strokeStyle",
            "fillStyle",
            "fillRule",
            "globalAlpha",
            "lineWidth",
            "lineCap",
            "lineJoin",
            "miterLimit",
            "globalCompositeOperation",
            "font",
            "filter"
        ];
        for (const s of e)c[s] !== void 0 && (t[s] = c[s]);
        c.setLineDash !== void 0 && (t.setLineDash(c.getLineDash()), t.lineDashOffset = c.lineDashOffset);
    }
    function ce(c) {
        if (c.strokeStyle = c.fillStyle = "#000000", c.fillRule = "nonzero", c.globalAlpha = 1, c.lineWidth = 1, c.lineCap = "butt", c.lineJoin = "miter", c.miterLimit = 10, c.globalCompositeOperation = "source-over", c.font = "10px sans-serif", c.setLineDash !== void 0 && (c.setLineDash([]), c.lineDashOffset = 0), !lt) {
            const { filter: t } = c;
            t !== "none" && t !== "" && (c.filter = "none");
        }
    }
    function ys(c, t) {
        if (t) return !0;
        const e = T.singularValueDecompose2dScale(c);
        e[0] = Math.fround(e[0]), e[1] = Math.fround(e[1]);
        const s = Math.fround((globalThis.devicePixelRatio || 1) * Vt.PDF_TO_CSS_UNITS);
        return e[0] <= s && e[1] <= s;
    }
    const Qi = [
        "butt",
        "round",
        "square"
    ], Ji = [
        "miter",
        "round",
        "bevel"
    ], Zi = {}, vs = {};
    class Ut {
        constructor(t, e, s, i, n, { optionalContentConfig: r, markedContentStack: a = null }, o, l){
            this.ctx = t, this.current = new ms(this.ctx.canvas.width, this.ctx.canvas.height), this.stateStack = [], this.pendingClip = null, this.pendingEOFill = !1, this.res = null, this.xobjs = null, this.commonObjs = e, this.objs = s, this.canvasFactory = i, this.filterFactory = n, this.groupStack = [], this.processingType3 = null, this.baseTransform = null, this.baseTransformStack = [], this.groupLevel = 0, this.smaskStack = [], this.smaskCounter = 0, this.tempSMask = null, this.suspendedCtx = null, this.contentVisible = !0, this.markedContentStack = a || [], this.optionalContentConfig = r, this.cachedCanvases = new Yi(this.canvasFactory), this.cachedPatterns = new Map, this.annotationCanvasMap = o, this.viewportScale = 1, this.outputScaleX = 1, this.outputScaleY = 1, this.pageColors = l, this._cachedScaleForStroking = [
                -1,
                0
            ], this._cachedGetSinglePixelWidth = null, this._cachedBitmapsMap = new Map;
        }
        getObject(t, e = null) {
            return typeof t == "string" ? t.startsWith("g_") ? this.commonObjs.get(t) : this.objs.get(t) : e;
        }
        beginDrawing({ transform: t, viewport: e, transparency: s = !1, background: i = null }) {
            const n = this.ctx.canvas.width, r = this.ctx.canvas.height, a = this.ctx.fillStyle;
            if (this.ctx.fillStyle = i || "#ffffff", this.ctx.fillRect(0, 0, n, r), this.ctx.fillStyle = a, s) {
                const o = this.cachedCanvases.getCanvas("transparent", n, r);
                this.compositeCtx = this.ctx, this.transparentCanvas = o.canvas, this.ctx = o.context, this.ctx.save(), this.ctx.transform(...q(this.compositeCtx));
            }
            this.ctx.save(), ce(this.ctx), t && (this.ctx.transform(...t), this.outputScaleX = t[0], this.outputScaleY = t[0]), this.ctx.transform(...e.transform), this.viewportScale = e.scale, this.baseTransform = q(this.ctx);
        }
        executeOperatorList(t, e, s, i) {
            const n = t.argsArray, r = t.fnArray;
            let a = e || 0;
            const o = n.length;
            if (o === a) return a;
            const l = o - a > ps && typeof s == "function", h = l ? Date.now() + Xi : 0;
            let d = 0;
            const u = this.commonObjs, f = this.objs;
            let p;
            for(;;){
                if (i !== void 0 && a === i.nextBreakPoint) return i.breakIt(a, s), a;
                if (p = r[a], p !== wt.dependency) this[p].apply(this, n[a]);
                else for (const g of n[a]){
                    const b = g.startsWith("g_") ? u : f;
                    if (!b.has(g)) return b.get(g, s), a;
                }
                if (a++, a === o) return a;
                if (l && ++d > ps) {
                    if (Date.now() > h) return s(), a;
                    d = 0;
                }
            }
        }
        #t() {
            for(; this.stateStack.length || this.inSMaskMode;)this.restore();
            this.current.activeSMask = null, this.ctx.restore(), this.transparentCanvas && (this.ctx = this.compositeCtx, this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.drawImage(this.transparentCanvas, 0, 0), this.ctx.restore(), this.transparentCanvas = null);
        }
        endDrawing() {
            this.#t(), this.cachedCanvases.clear(), this.cachedPatterns.clear();
            for (const t of this._cachedBitmapsMap.values()){
                for (const e of t.values())typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement && (e.width = e.height = 0);
                t.clear();
            }
            this._cachedBitmapsMap.clear(), this.#e();
        }
        #e() {
            if (this.pageColors) {
                const t = this.filterFactory.addHCMFilter(this.pageColors.foreground, this.pageColors.background);
                if (t !== "none") {
                    const e = this.ctx.filter;
                    this.ctx.filter = t, this.ctx.drawImage(this.ctx.canvas, 0, 0), this.ctx.filter = e;
                }
            }
        }
        _scaleImage(t, e) {
            const s = t.width ?? t.displayWidth, i = t.height ?? t.displayHeight;
            let n = Math.max(Math.hypot(e[0], e[1]), 1), r = Math.max(Math.hypot(e[2], e[3]), 1), a = s, o = i, l = "prescale1", h, d;
            for(; n > 2 && a > 1 || r > 2 && o > 1;){
                let u = a, f = o;
                n > 2 && a > 1 && (u = a >= 16384 ? Math.floor(a / 2) - 1 || 1 : Math.ceil(a / 2), n /= a / u), r > 2 && o > 1 && (f = o >= 16384 ? Math.floor(o / 2) - 1 || 1 : Math.ceil(o) / 2, r /= o / f), h = this.cachedCanvases.getCanvas(l, u, f), d = h.context, d.clearRect(0, 0, u, f), d.drawImage(t, 0, 0, a, o, 0, 0, u, f), t = h.canvas, a = u, o = f, l = l === "prescale1" ? "prescale2" : "prescale1";
            }
            return {
                img: t,
                paintWidth: a,
                paintHeight: o
            };
        }
        _createMaskCanvas(t) {
            const e = this.ctx, { width: s, height: i } = t, n = this.current.fillColor, r = this.current.patternFill, a = q(e);
            let o, l, h, d;
            if ((t.bitmap || t.data) && t.count > 1) {
                const R = t.bitmap || t.data.buffer;
                l = JSON.stringify(r ? a : [
                    a.slice(0, 4),
                    n
                ]), o = this._cachedBitmapsMap.get(R), o || (o = new Map, this._cachedBitmapsMap.set(R, o));
                const M = o.get(l);
                if (M && !r) {
                    const $ = Math.round(Math.min(a[0], a[2]) + a[4]), D = Math.round(Math.min(a[1], a[3]) + a[5]);
                    return {
                        canvas: M,
                        offsetX: $,
                        offsetY: D
                    };
                }
                h = M;
            }
            h || (d = this.cachedCanvases.getCanvas("maskCanvas", s, i), As(d.context, t));
            let u = T.transform(a, [
                1 / s,
                0,
                0,
                -1 / i,
                0,
                0
            ]);
            u = T.transform(u, [
                1,
                0,
                0,
                1,
                0,
                -i
            ]);
            const [f, p, g, b] = T.getAxialAlignedBoundingBox([
                0,
                0,
                s,
                i
            ], u), m = Math.round(g - f) || 1, A = Math.round(b - p) || 1, y = this.cachedCanvases.getCanvas("fillCanvas", m, A), v = y.context, w = f, S = p;
            v.translate(-w, -S), v.transform(...u), h || (h = this._scaleImage(d.canvas, St(v)), h = h.img, o && r && o.set(l, h)), v.imageSmoothingEnabled = ys(q(v), t.interpolate), he(v, h, 0, 0, h.width, h.height, 0, 0, s, i), v.globalCompositeOperation = "source-in";
            const _ = T.transform(St(v), [
                1,
                0,
                0,
                1,
                -w,
                -S
            ]);
            return v.fillStyle = r ? n.getPattern(e, this, _, ot.FILL) : n, v.fillRect(0, 0, s, i), o && !r && (this.cachedCanvases.delete("fillCanvas"), o.set(l, y.canvas)), {
                canvas: y.canvas,
                offsetX: Math.round(w),
                offsetY: Math.round(S)
            };
        }
        setLineWidth(t) {
            t !== this.current.lineWidth && (this._cachedScaleForStroking[0] = -1), this.current.lineWidth = t, this.ctx.lineWidth = t;
        }
        setLineCap(t) {
            this.ctx.lineCap = Qi[t];
        }
        setLineJoin(t) {
            this.ctx.lineJoin = Ji[t];
        }
        setMiterLimit(t) {
            this.ctx.miterLimit = t;
        }
        setDash(t, e) {
            const s = this.ctx;
            s.setLineDash !== void 0 && (s.setLineDash(t), s.lineDashOffset = e);
        }
        setRenderingIntent(t) {}
        setFlatness(t) {}
        setGState(t) {
            for (const [e, s] of t)switch(e){
                case "LW":
                    this.setLineWidth(s);
                    break;
                case "LC":
                    this.setLineCap(s);
                    break;
                case "LJ":
                    this.setLineJoin(s);
                    break;
                case "ML":
                    this.setMiterLimit(s);
                    break;
                case "D":
                    this.setDash(s[0], s[1]);
                    break;
                case "RI":
                    this.setRenderingIntent(s);
                    break;
                case "FL":
                    this.setFlatness(s);
                    break;
                case "Font":
                    this.setFont(s[0], s[1]);
                    break;
                case "CA":
                    this.current.strokeAlpha = s;
                    break;
                case "ca":
                    this.current.fillAlpha = s, this.ctx.globalAlpha = s;
                    break;
                case "BM":
                    this.ctx.globalCompositeOperation = s;
                    break;
                case "SMask":
                    this.current.activeSMask = s ? this.tempSMask : null, this.tempSMask = null, this.checkSMaskState();
                    break;
                case "TR":
                    this.ctx.filter = this.current.transferMaps = this.filterFactory.addFilter(s);
                    break;
            }
        }
        get inSMaskMode() {
            return !!this.suspendedCtx;
        }
        checkSMaskState() {
            const t = this.inSMaskMode;
            this.current.activeSMask && !t ? this.beginSMaskMode() : !this.current.activeSMask && t && this.endSMaskMode();
        }
        beginSMaskMode() {
            if (this.inSMaskMode) throw new Error("beginSMaskMode called while already in smask mode");
            const t = this.ctx.canvas.width, e = this.ctx.canvas.height, s = "smaskGroupAt" + this.groupLevel, i = this.cachedCanvases.getCanvas(s, t, e);
            this.suspendedCtx = this.ctx, this.ctx = i.context;
            const n = this.ctx;
            n.setTransform(...q(this.suspendedCtx)), Xt(this.suspendedCtx, n), qi(n, this.suspendedCtx), this.setGState([
                [
                    "BM",
                    "source-over"
                ],
                [
                    "ca",
                    1
                ],
                [
                    "CA",
                    1
                ]
            ]);
        }
        endSMaskMode() {
            if (!this.inSMaskMode) throw new Error("endSMaskMode called while not in smask mode");
            this.ctx._removeMirroring(), Xt(this.ctx, this.suspendedCtx), this.ctx = this.suspendedCtx, this.suspendedCtx = null;
        }
        compose(t) {
            if (!this.current.activeSMask) return;
            t ? (t[0] = Math.floor(t[0]), t[1] = Math.floor(t[1]), t[2] = Math.ceil(t[2]), t[3] = Math.ceil(t[3])) : t = [
                0,
                0,
                this.ctx.canvas.width,
                this.ctx.canvas.height
            ];
            const e = this.current.activeSMask, s = this.suspendedCtx;
            this.composeSMask(s, e, this.ctx, t), this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height), this.ctx.restore();
        }
        composeSMask(t, e, s, i) {
            const n = i[0], r = i[1], a = i[2] - n, o = i[3] - r;
            a === 0 || o === 0 || (this.genericComposeSMask(e.context, s, a, o, e.subtype, e.backdrop, e.transferMap, n, r, e.offsetX, e.offsetY), t.save(), t.globalAlpha = 1, t.globalCompositeOperation = "source-over", t.setTransform(1, 0, 0, 1, 0, 0), t.drawImage(s.canvas, 0, 0), t.restore());
        }
        genericComposeSMask(t, e, s, i, n, r, a, o, l, h, d) {
            let u = t.canvas, f = o - h, p = l - d;
            if (r) {
                const b = T.makeHexColor(...r);
                if (f < 0 || p < 0 || f + s > u.width || p + i > u.height) {
                    const m = this.cachedCanvases.getCanvas("maskExtension", s, i), A = m.context;
                    A.drawImage(u, -f, -p), A.globalCompositeOperation = "destination-atop", A.fillStyle = b, A.fillRect(0, 0, s, i), A.globalCompositeOperation = "source-over", u = m.canvas, f = p = 0;
                } else {
                    t.save(), t.globalAlpha = 1, t.setTransform(1, 0, 0, 1, 0, 0);
                    const m = new Path2D;
                    m.rect(f, p, s, i), t.clip(m), t.globalCompositeOperation = "destination-atop", t.fillStyle = b, t.fillRect(f, p, s, i), t.restore();
                }
            }
            e.save(), e.globalAlpha = 1, e.setTransform(1, 0, 0, 1, 0, 0), n === "Alpha" && a ? e.filter = this.filterFactory.addAlphaFilter(a) : n === "Luminosity" && (e.filter = this.filterFactory.addLuminosityFilter(a));
            const g = new Path2D;
            g.rect(o, l, s, i), e.clip(g), e.globalCompositeOperation = "destination-in", e.drawImage(u, f, p, s, i, o, l, s, i), e.restore();
        }
        save() {
            this.inSMaskMode ? (Xt(this.ctx, this.suspendedCtx), this.suspendedCtx.save()) : this.ctx.save();
            const t = this.current;
            this.stateStack.push(t), this.current = t.clone();
        }
        restore() {
            this.stateStack.length === 0 && this.inSMaskMode && this.endSMaskMode(), this.stateStack.length !== 0 && (this.current = this.stateStack.pop(), this.inSMaskMode ? (this.suspendedCtx.restore(), Xt(this.suspendedCtx, this.ctx)) : this.ctx.restore(), this.checkSMaskState(), this.pendingClip = null, this._cachedScaleForStroking[0] = -1, this._cachedGetSinglePixelWidth = null);
        }
        transform(t, e, s, i, n, r) {
            this.ctx.transform(t, e, s, i, n, r), this._cachedScaleForStroking[0] = -1, this._cachedGetSinglePixelWidth = null;
        }
        constructPath(t, e, s) {
            const i = this.ctx, n = this.current;
            let r = n.x, a = n.y, o, l;
            const h = q(i), d = h[0] === 0 && h[3] === 0 || h[1] === 0 && h[2] === 0, u = d ? s.slice(0) : null;
            for(let f = 0, p = 0, g = t.length; f < g; f++)switch(t[f] | 0){
                case wt.rectangle:
                    r = e[p++], a = e[p++];
                    const b = e[p++], m = e[p++], A = r + b, y = a + m;
                    i.moveTo(r, a), b === 0 || m === 0 ? i.lineTo(A, y) : (i.lineTo(A, a), i.lineTo(A, y), i.lineTo(r, y)), d || n.updateRectMinMax(h, [
                        r,
                        a,
                        A,
                        y
                    ]), i.closePath();
                    break;
                case wt.moveTo:
                    r = e[p++], a = e[p++], i.moveTo(r, a), d || n.updatePathMinMax(h, r, a);
                    break;
                case wt.lineTo:
                    r = e[p++], a = e[p++], i.lineTo(r, a), d || n.updatePathMinMax(h, r, a);
                    break;
                case wt.curveTo:
                    o = r, l = a, r = e[p + 4], a = e[p + 5], i.bezierCurveTo(e[p], e[p + 1], e[p + 2], e[p + 3], r, a), n.updateCurvePathMinMax(h, o, l, e[p], e[p + 1], e[p + 2], e[p + 3], r, a, u), p += 6;
                    break;
                case wt.curveTo2:
                    o = r, l = a, i.bezierCurveTo(r, a, e[p], e[p + 1], e[p + 2], e[p + 3]), n.updateCurvePathMinMax(h, o, l, r, a, e[p], e[p + 1], e[p + 2], e[p + 3], u), r = e[p + 2], a = e[p + 3], p += 4;
                    break;
                case wt.curveTo3:
                    o = r, l = a, r = e[p + 2], a = e[p + 3], i.bezierCurveTo(e[p], e[p + 1], r, a, r, a), n.updateCurvePathMinMax(h, o, l, e[p], e[p + 1], r, a, r, a, u), p += 4;
                    break;
                case wt.closePath:
                    i.closePath();
                    break;
            }
            d && n.updateScalingPathMinMax(h, u), n.setCurrentPoint(r, a);
        }
        closePath() {
            this.ctx.closePath();
        }
        stroke(t = !0) {
            const e = this.ctx, s = this.current.strokeColor;
            e.globalAlpha = this.current.strokeAlpha, this.contentVisible && (typeof s == "object" && s?.getPattern ? (e.save(), e.strokeStyle = s.getPattern(e, this, St(e), ot.STROKE), this.rescaleAndStroke(!1), e.restore()) : this.rescaleAndStroke(!0)), t && this.consumePath(this.current.getClippedPathBoundingBox()), e.globalAlpha = this.current.fillAlpha;
        }
        closeStroke() {
            this.closePath(), this.stroke();
        }
        fill(t = !0) {
            const e = this.ctx, s = this.current.fillColor, i = this.current.patternFill;
            let n = !1;
            i && (e.save(), e.fillStyle = s.getPattern(e, this, St(e), ot.FILL), n = !0);
            const r = this.current.getClippedPathBoundingBox();
            this.contentVisible && r !== null && (this.pendingEOFill ? (e.fill("evenodd"), this.pendingEOFill = !1) : e.fill()), n && e.restore(), t && this.consumePath(r);
        }
        eoFill() {
            this.pendingEOFill = !0, this.fill();
        }
        fillStroke() {
            this.fill(!1), this.stroke(!1), this.consumePath();
        }
        eoFillStroke() {
            this.pendingEOFill = !0, this.fillStroke();
        }
        closeFillStroke() {
            this.closePath(), this.fillStroke();
        }
        closeEOFillStroke() {
            this.pendingEOFill = !0, this.closePath(), this.fillStroke();
        }
        endPath() {
            this.consumePath();
        }
        clip() {
            this.pendingClip = Zi;
        }
        eoClip() {
            this.pendingClip = vs;
        }
        beginText() {
            this.current.textMatrix = xs, this.current.textMatrixScale = 1, this.current.x = this.current.lineX = 0, this.current.y = this.current.lineY = 0;
        }
        endText() {
            const t = this.pendingTextPaths, e = this.ctx;
            if (t === void 0) {
                e.beginPath();
                return;
            }
            const s = new Path2D, i = e.getTransform().invertSelf();
            for (const { transform: n, x: r, y: a, fontSize: o, path: l } of t)s.addPath(l, new DOMMatrix(n).preMultiplySelf(i).translate(r, a).scale(o, -o));
            e.clip(s), e.beginPath(), delete this.pendingTextPaths;
        }
        setCharSpacing(t) {
            this.current.charSpacing = t;
        }
        setWordSpacing(t) {
            this.current.wordSpacing = t;
        }
        setHScale(t) {
            this.current.textHScale = t / 100;
        }
        setLeading(t) {
            this.current.leading = -t;
        }
        setFont(t, e) {
            const s = this.commonObjs.get(t), i = this.current;
            if (!s) throw new Error(`Can't find font for ${t}`);
            if (i.fontMatrix = s.fontMatrix || Le, (i.fontMatrix[0] === 0 || i.fontMatrix[3] === 0) && N("Invalid font matrix for font " + t), e < 0 ? (e = -e, i.fontDirection = -1) : i.fontDirection = 1, this.current.font = s, this.current.fontSize = e, s.isType3Font) return;
            const n = s.loadedName || "sans-serif", r = s.systemFontInfo?.css || `"${n}", ${s.fallbackName}`;
            let a = "normal";
            s.black ? a = "900" : s.bold && (a = "bold");
            const o = s.italic ? "italic" : "normal";
            let l = e;
            e < us ? l = us : e > fs && (l = fs), this.current.fontSizeScale = e / l, this.ctx.font = `${o} ${a} ${l}px ${r}`;
        }
        setTextRenderingMode(t) {
            this.current.textRenderingMode = t;
        }
        setTextRise(t) {
            this.current.textRise = t;
        }
        moveText(t, e) {
            this.current.x = this.current.lineX += t, this.current.y = this.current.lineY += e;
        }
        setLeadingMoveText(t, e) {
            this.setLeading(-e), this.moveText(t, e);
        }
        setTextMatrix(t, e, s, i, n, r) {
            this.current.textMatrix = [
                t,
                e,
                s,
                i,
                n,
                r
            ], this.current.textMatrixScale = Math.hypot(t, e), this.current.x = this.current.lineX = 0, this.current.y = this.current.lineY = 0;
        }
        nextLine() {
            this.moveText(0, this.current.leading);
        }
        #s(t, e, s) {
            const i = new Path2D;
            return i.addPath(t, new DOMMatrix(s).invertSelf().multiplySelf(e)), i;
        }
        paintChar(t, e, s, i, n) {
            const r = this.ctx, a = this.current, o = a.font, l = a.textRenderingMode, h = a.fontSize / a.fontSizeScale, d = l & at.FILL_STROKE_MASK, u = !!(l & at.ADD_TO_PATH_FLAG), f = a.patternFill && !o.missingFile, p = a.patternStroke && !o.missingFile;
            let g;
            if ((o.disableFontFace || u || f || p) && (g = o.getPathGenerator(this.commonObjs, t)), o.disableFontFace || f || p) {
                if (r.save(), r.translate(e, s), r.scale(h, -h), d === at.FILL || d === at.FILL_STROKE) if (i) {
                    const b = r.getTransform();
                    r.setTransform(...i), r.fill(this.#s(g, b, i));
                } else r.fill(g);
                if (d === at.STROKE || d === at.FILL_STROKE) if (n) {
                    const b = r.getTransform();
                    r.setTransform(...n), r.stroke(this.#s(g, b, n));
                } else r.lineWidth /= h, r.stroke(g);
                r.restore();
            } else (d === at.FILL || d === at.FILL_STROKE) && r.fillText(t, e, s), (d === at.STROKE || d === at.FILL_STROKE) && r.strokeText(t, e, s);
            u && (this.pendingTextPaths ||= []).push({
                transform: q(r),
                x: e,
                y: s,
                fontSize: h,
                path: g
            });
        }
        get isFontSubpixelAAEnabled() {
            const { context: t } = this.cachedCanvases.getCanvas("isFontSubpixelAAEnabled", 10, 10);
            t.scale(1.5, 1), t.fillText("I", 0, 10);
            const e = t.getImageData(0, 0, 10, 10).data;
            let s = !1;
            for(let i = 3; i < e.length; i += 4)if (e[i] > 0 && e[i] < 255) {
                s = !0;
                break;
            }
            return O(this, "isFontSubpixelAAEnabled", s);
        }
        showText(t) {
            const e = this.current, s = e.font;
            if (s.isType3Font) return this.showType3Text(t);
            const i = e.fontSize;
            if (i === 0) return;
            const n = this.ctx, r = e.fontSizeScale, a = e.charSpacing, o = e.wordSpacing, l = e.fontDirection, h = e.textHScale * l, d = t.length, u = s.vertical, f = u ? 1 : -1, p = s.defaultVMetrics, g = i * e.fontMatrix[0], b = e.textRenderingMode === at.FILL && !s.disableFontFace && !e.patternFill;
            n.save(), n.transform(...e.textMatrix), n.translate(e.x, e.y + e.textRise), l > 0 ? n.scale(h, -1) : n.scale(h, 1);
            let m, A;
            if (e.patternFill) {
                n.save();
                const _ = e.fillColor.getPattern(n, this, St(n), ot.FILL);
                m = q(n), n.restore(), n.fillStyle = _;
            }
            if (e.patternStroke) {
                n.save();
                const _ = e.strokeColor.getPattern(n, this, St(n), ot.STROKE);
                A = q(n), n.restore(), n.strokeStyle = _;
            }
            let y = e.lineWidth;
            const v = e.textMatrixScale;
            if (v === 0 || y === 0) {
                const _ = e.textRenderingMode & at.FILL_STROKE_MASK;
                (_ === at.STROKE || _ === at.FILL_STROKE) && (y = this.getSinglePixelWidth());
            } else y /= v;
            if (r !== 1 && (n.scale(r, r), y /= r), n.lineWidth = y, s.isInvalidPDFjsFont) {
                const _ = [];
                let R = 0;
                for (const M of t)_.push(M.unicode), R += M.width;
                n.fillText(_.join(""), 0, 0), e.x += R * g * h, n.restore(), this.compose();
                return;
            }
            let w = 0, S;
            for(S = 0; S < d; ++S){
                const _ = t[S];
                if (typeof _ == "number") {
                    w += f * _ * i / 1e3;
                    continue;
                }
                let R = !1;
                const M = (_.isSpace ? o : 0) + a, $ = _.fontChar, D = _.accent;
                let j, K, P = _.width;
                if (u) {
                    const E = _.vmetric || p, x = -(_.vmetric ? E[1] : P * .5) * g, z = E[2] * g;
                    P = E ? -E[0] : P, j = x / r, K = (w + z) / r;
                } else j = w / r, K = 0;
                if (s.remeasure && P > 0) {
                    const E = n.measureText($).width * 1e3 / i * r;
                    if (P < E && this.isFontSubpixelAAEnabled) {
                        const x = P / E;
                        R = !0, n.save(), n.scale(x, 1), j /= x;
                    } else P !== E && (j += (P - E) / 2e3 * i / r);
                }
                if (this.contentVisible && (_.isInFont || s.missingFile)) {
                    if (b && !D) n.fillText($, j, K);
                    else if (this.paintChar($, j, K, m, A), D) {
                        const E = j + i * D.offset.x / r, x = K - i * D.offset.y / r;
                        this.paintChar(D.fontChar, E, x, m, A);
                    }
                }
                const B = u ? P * g - M * l : P * g + M * l;
                w += B, R && n.restore();
            }
            u ? e.y -= w : e.x += w * h, n.restore(), this.compose();
        }
        showType3Text(t) {
            const e = this.ctx, s = this.current, i = s.font, n = s.fontSize, r = s.fontDirection, a = i.vertical ? 1 : -1, o = s.charSpacing, l = s.wordSpacing, h = s.textHScale * r, d = s.fontMatrix || Le, u = t.length, f = s.textRenderingMode === at.INVISIBLE;
            let p, g, b, m;
            if (!(f || n === 0)) {
                for(this._cachedScaleForStroking[0] = -1, this._cachedGetSinglePixelWidth = null, e.save(), e.transform(...s.textMatrix), e.translate(s.x, s.y), e.scale(h, r), p = 0; p < u; ++p){
                    if (g = t[p], typeof g == "number") {
                        m = a * g * n / 1e3, this.ctx.translate(m, 0), s.x += m * h;
                        continue;
                    }
                    const A = (g.isSpace ? l : 0) + o, y = i.charProcOperatorList[g.operatorListId];
                    if (!y) {
                        N(`Type3 character "${g.operatorListId}" is not available.`);
                        continue;
                    }
                    this.contentVisible && (this.processingType3 = g, this.save(), e.scale(n, n), e.transform(...d), this.executeOperatorList(y), this.restore()), b = T.applyTransform([
                        g.width,
                        0
                    ], d)[0] * n + A, e.translate(b, 0), s.x += b * h;
                }
                e.restore(), this.processingType3 = null;
            }
        }
        setCharWidth(t, e) {}
        setCharWidthAndBounds(t, e, s, i, n, r) {
            this.ctx.rect(s, i, n - s, r - i), this.ctx.clip(), this.endPath();
        }
        getColorN_Pattern(t) {
            let e;
            if (t[0] === "TilingPattern") {
                const s = t[1], i = this.baseTransform || q(this.ctx), n = {
                    createCanvasGraphics: (r)=>new Ut(r, this.commonObjs, this.objs, this.canvasFactory, this.filterFactory, {
                            optionalContentConfig: this.optionalContentConfig,
                            markedContentStack: this.markedContentStack
                        })
                };
                e = new Ke(t, s, this.ctx, n, i);
            } else e = this._getPattern(t[1], t[2]);
            return e;
        }
        setStrokeColorN() {
            this.current.strokeColor = this.getColorN_Pattern(arguments), this.current.patternStroke = !0;
        }
        setFillColorN() {
            this.current.fillColor = this.getColorN_Pattern(arguments), this.current.patternFill = !0;
        }
        setStrokeRGBColor(t, e, s) {
            this.ctx.strokeStyle = this.current.strokeColor = T.makeHexColor(t, e, s), this.current.patternStroke = !1;
        }
        setStrokeTransparent() {
            this.ctx.strokeStyle = this.current.strokeColor = "transparent", this.current.patternStroke = !1;
        }
        setFillRGBColor(t, e, s) {
            this.ctx.fillStyle = this.current.fillColor = T.makeHexColor(t, e, s), this.current.patternFill = !1;
        }
        setFillTransparent() {
            this.ctx.fillStyle = this.current.fillColor = "transparent", this.current.patternFill = !1;
        }
        _getPattern(t, e = null) {
            let s;
            return this.cachedPatterns.has(t) ? s = this.cachedPatterns.get(t) : (s = Vi(this.getObject(t)), this.cachedPatterns.set(t, s)), e && (s.matrix = e), s;
        }
        shadingFill(t) {
            if (!this.contentVisible) return;
            const e = this.ctx;
            this.save();
            const s = this._getPattern(t);
            e.fillStyle = s.getPattern(e, this, St(e), ot.SHADING);
            const i = St(e);
            if (i) {
                const { width: n, height: r } = e.canvas, [a, o, l, h] = T.getAxialAlignedBoundingBox([
                    0,
                    0,
                    n,
                    r
                ], i);
                this.ctx.fillRect(a, o, l - a, h - o);
            } else this.ctx.fillRect(-1e10, -1e10, 2e10, 2e10);
            this.compose(this.current.getClippedPathBoundingBox()), this.restore();
        }
        beginInlineImage() {
            V("Should not call beginInlineImage");
        }
        beginImageData() {
            V("Should not call beginImageData");
        }
        paintFormXObjectBegin(t, e) {
            if (this.contentVisible && (this.save(), this.baseTransformStack.push(this.baseTransform), t && this.transform(...t), this.baseTransform = q(this.ctx), e)) {
                const s = e[2] - e[0], i = e[3] - e[1];
                this.ctx.rect(e[0], e[1], s, i), this.current.updateRectMinMax(q(this.ctx), e), this.clip(), this.endPath();
            }
        }
        paintFormXObjectEnd() {
            this.contentVisible && (this.restore(), this.baseTransform = this.baseTransformStack.pop());
        }
        beginGroup(t) {
            if (!this.contentVisible) return;
            this.save(), this.inSMaskMode && (this.endSMaskMode(), this.current.activeSMask = null);
            const e = this.ctx;
            t.isolated || be("TODO: Support non-isolated groups."), t.knockout && N("Knockout groups not supported.");
            const s = q(e);
            if (t.matrix && e.transform(...t.matrix), !t.bbox) throw new Error("Bounding box is required.");
            let i = T.getAxialAlignedBoundingBox(t.bbox, q(e));
            const n = [
                0,
                0,
                e.canvas.width,
                e.canvas.height
            ];
            i = T.intersect(i, n) || [
                0,
                0,
                0,
                0
            ];
            const r = Math.floor(i[0]), a = Math.floor(i[1]), o = Math.max(Math.ceil(i[2]) - r, 1), l = Math.max(Math.ceil(i[3]) - a, 1);
            this.current.startNewPathAndClipBox([
                0,
                0,
                o,
                l
            ]);
            let h = "groupAt" + this.groupLevel;
            t.smask && (h += "_smask_" + this.smaskCounter++ % 2);
            const d = this.cachedCanvases.getCanvas(h, o, l), u = d.context;
            u.translate(-r, -a), u.transform(...s), t.smask ? this.smaskStack.push({
                canvas: d.canvas,
                context: u,
                offsetX: r,
                offsetY: a,
                subtype: t.smask.subtype,
                backdrop: t.smask.backdrop,
                transferMap: t.smask.transferMap || null,
                startTransformInverse: null
            }) : (e.setTransform(1, 0, 0, 1, 0, 0), e.translate(r, a), e.save()), Xt(e, u), this.ctx = u, this.setGState([
                [
                    "BM",
                    "source-over"
                ],
                [
                    "ca",
                    1
                ],
                [
                    "CA",
                    1
                ]
            ]), this.groupStack.push(e), this.groupLevel++;
        }
        endGroup(t) {
            if (!this.contentVisible) return;
            this.groupLevel--;
            const e = this.ctx, s = this.groupStack.pop();
            if (this.ctx = s, this.ctx.imageSmoothingEnabled = !1, t.smask) this.tempSMask = this.smaskStack.pop(), this.restore();
            else {
                this.ctx.restore();
                const i = q(this.ctx);
                this.restore(), this.ctx.save(), this.ctx.setTransform(...i);
                const n = T.getAxialAlignedBoundingBox([
                    0,
                    0,
                    e.canvas.width,
                    e.canvas.height
                ], i);
                this.ctx.drawImage(e.canvas, 0, 0), this.ctx.restore(), this.compose(n);
            }
        }
        beginAnnotation(t, e, s, i, n) {
            if (this.#t(), ce(this.ctx), this.ctx.save(), this.save(), this.baseTransform && this.ctx.setTransform(...this.baseTransform), e) {
                const r = e[2] - e[0], a = e[3] - e[1];
                if (n && this.annotationCanvasMap) {
                    s = s.slice(), s[4] -= e[0], s[5] -= e[1], e = e.slice(), e[0] = e[1] = 0, e[2] = r, e[3] = a;
                    const [o, l] = T.singularValueDecompose2dScale(q(this.ctx)), { viewportScale: h } = this, d = Math.ceil(r * this.outputScaleX * h), u = Math.ceil(a * this.outputScaleY * h);
                    this.annotationCanvas = this.canvasFactory.create(d, u);
                    const { canvas: f, context: p } = this.annotationCanvas;
                    this.annotationCanvasMap.set(t, f), this.annotationCanvas.savedCtx = this.ctx, this.ctx = p, this.ctx.save(), this.ctx.setTransform(o, 0, 0, -l, 0, a * l), ce(this.ctx);
                } else ce(this.ctx), this.endPath(), this.ctx.rect(e[0], e[1], r, a), this.ctx.clip(), this.ctx.beginPath();
            }
            this.current = new ms(this.ctx.canvas.width, this.ctx.canvas.height), this.transform(...s), this.transform(...i);
        }
        endAnnotation() {
            this.annotationCanvas && (this.ctx.restore(), this.#e(), this.ctx = this.annotationCanvas.savedCtx, delete this.annotationCanvas.savedCtx, delete this.annotationCanvas);
        }
        paintImageMaskXObject(t) {
            if (!this.contentVisible) return;
            const e = t.count;
            t = this.getObject(t.data, t), t.count = e;
            const s = this.ctx, i = this.processingType3;
            if (i && (i.compiled === void 0 && (i.compiled = Ki(t)), i.compiled)) {
                i.compiled(s);
                return;
            }
            const n = this._createMaskCanvas(t), r = n.canvas;
            s.save(), s.setTransform(1, 0, 0, 1, 0, 0), s.drawImage(r, n.offsetX, n.offsetY), s.restore(), this.compose();
        }
        paintImageMaskXObjectRepeat(t, e, s = 0, i = 0, n, r) {
            if (!this.contentVisible) return;
            t = this.getObject(t.data, t);
            const a = this.ctx;
            a.save();
            const o = q(a);
            a.transform(e, s, i, n, 0, 0);
            const l = this._createMaskCanvas(t);
            a.setTransform(1, 0, 0, 1, l.offsetX - o[4], l.offsetY - o[5]);
            for(let h = 0, d = r.length; h < d; h += 2){
                const u = T.transform(o, [
                    e,
                    s,
                    i,
                    n,
                    r[h],
                    r[h + 1]
                ]), [f, p] = T.applyTransform([
                    0,
                    0
                ], u);
                a.drawImage(l.canvas, f, p);
            }
            a.restore(), this.compose();
        }
        paintImageMaskXObjectGroup(t) {
            if (!this.contentVisible) return;
            const e = this.ctx, s = this.current.fillColor, i = this.current.patternFill;
            for (const n of t){
                const { data: r, width: a, height: o, transform: l } = n, h = this.cachedCanvases.getCanvas("maskCanvas", a, o), d = h.context;
                d.save();
                const u = this.getObject(r, n);
                As(d, u), d.globalCompositeOperation = "source-in", d.fillStyle = i ? s.getPattern(d, this, St(e), ot.FILL) : s, d.fillRect(0, 0, a, o), d.restore(), e.save(), e.transform(...l), e.scale(1, -1), he(e, h.canvas, 0, 0, a, o, 0, -1, 1, 1), e.restore();
            }
            this.compose();
        }
        paintImageXObject(t) {
            if (!this.contentVisible) return;
            const e = this.getObject(t);
            if (!e) {
                N("Dependent image isn't ready yet");
                return;
            }
            this.paintInlineImageXObject(e);
        }
        paintImageXObjectRepeat(t, e, s, i) {
            if (!this.contentVisible) return;
            const n = this.getObject(t);
            if (!n) {
                N("Dependent image isn't ready yet");
                return;
            }
            const r = n.width, a = n.height, o = [];
            for(let l = 0, h = i.length; l < h; l += 2)o.push({
                transform: [
                    e,
                    0,
                    0,
                    s,
                    i[l],
                    i[l + 1]
                ],
                x: 0,
                y: 0,
                w: r,
                h: a
            });
            this.paintInlineImageXObjectGroup(n, o);
        }
        applyTransferMapsToCanvas(t) {
            return this.current.transferMaps !== "none" && (t.filter = this.current.transferMaps, t.drawImage(t.canvas, 0, 0), t.filter = "none"), t.canvas;
        }
        applyTransferMapsToBitmap(t) {
            if (this.current.transferMaps === "none") return t.bitmap;
            const { bitmap: e, width: s, height: i } = t, n = this.cachedCanvases.getCanvas("inlineImage", s, i), r = n.context;
            return r.filter = this.current.transferMaps, r.drawImage(e, 0, 0), r.filter = "none", n.canvas;
        }
        paintInlineImageXObject(t) {
            if (!this.contentVisible) return;
            const e = t.width, s = t.height, i = this.ctx;
            if (this.save(), !lt) {
                const { filter: a } = i;
                a !== "none" && a !== "" && (i.filter = "none");
            }
            i.scale(1 / e, -1 / s);
            let n;
            if (t.bitmap) n = this.applyTransferMapsToBitmap(t);
            else if (typeof HTMLElement == "function" && t instanceof HTMLElement || !t.data) n = t;
            else {
                const o = this.cachedCanvases.getCanvas("inlineImage", e, s).context;
                bs(o, t), n = this.applyTransferMapsToCanvas(o);
            }
            const r = this._scaleImage(n, St(i));
            i.imageSmoothingEnabled = ys(q(i), t.interpolate), he(i, r.img, 0, 0, r.paintWidth, r.paintHeight, 0, -s, e, s), this.compose(), this.restore();
        }
        paintInlineImageXObjectGroup(t, e) {
            if (!this.contentVisible) return;
            const s = this.ctx;
            let i;
            if (t.bitmap) i = t.bitmap;
            else {
                const n = t.width, r = t.height, o = this.cachedCanvases.getCanvas("inlineImage", n, r).context;
                bs(o, t), i = this.applyTransferMapsToCanvas(o);
            }
            for (const n of e)s.save(), s.transform(...n.transform), s.scale(1, -1), he(s, i, n.x, n.y, n.w, n.h, 0, -1, 1, 1), s.restore();
            this.compose();
        }
        paintSolidColorImageMask() {
            this.contentVisible && (this.ctx.fillRect(0, 0, 1, 1), this.compose());
        }
        markPoint(t) {}
        markPointProps(t, e) {}
        beginMarkedContent(t) {
            this.markedContentStack.push({
                visible: !0
            });
        }
        beginMarkedContentProps(t, e) {
            t === "OC" ? this.markedContentStack.push({
                visible: this.optionalContentConfig.isVisible(e)
            }) : this.markedContentStack.push({
                visible: !0
            }), this.contentVisible = this.isContentVisible();
        }
        endMarkedContent() {
            this.markedContentStack.pop(), this.contentVisible = this.isContentVisible();
        }
        beginCompat() {}
        endCompat() {}
        consumePath(t) {
            const e = this.current.isEmptyClip();
            this.pendingClip && this.current.updateClipFromPath(), this.pendingClip || this.compose(t);
            const s = this.ctx;
            this.pendingClip && (e || (this.pendingClip === vs ? s.clip("evenodd") : s.clip()), this.pendingClip = null), this.current.startNewPathAndClipBox(this.current.clipBox), s.beginPath();
        }
        getSinglePixelWidth() {
            if (!this._cachedGetSinglePixelWidth) {
                const t = q(this.ctx);
                if (t[1] === 0 && t[2] === 0) this._cachedGetSinglePixelWidth = 1 / Math.min(Math.abs(t[0]), Math.abs(t[3]));
                else {
                    const e = Math.abs(t[0] * t[3] - t[2] * t[1]), s = Math.hypot(t[0], t[2]), i = Math.hypot(t[1], t[3]);
                    this._cachedGetSinglePixelWidth = Math.max(s, i) / e;
                }
            }
            return this._cachedGetSinglePixelWidth;
        }
        getScaleForStroking() {
            if (this._cachedScaleForStroking[0] === -1) {
                const { lineWidth: t } = this.current, { a: e, b: s, c: i, d: n } = this.ctx.getTransform();
                let r, a;
                if (s === 0 && i === 0) {
                    const o = Math.abs(e), l = Math.abs(n);
                    if (o === l) if (t === 0) r = a = 1 / o;
                    else {
                        const h = o * t;
                        r = a = h < 1 ? 1 / h : 1;
                    }
                    else if (t === 0) r = 1 / o, a = 1 / l;
                    else {
                        const h = o * t, d = l * t;
                        r = h < 1 ? 1 / h : 1, a = d < 1 ? 1 / d : 1;
                    }
                } else {
                    const o = Math.abs(e * n - s * i), l = Math.hypot(e, s), h = Math.hypot(i, n);
                    if (t === 0) r = h / o, a = l / o;
                    else {
                        const d = t * o;
                        r = h > d ? h / d : 1, a = l > d ? l / d : 1;
                    }
                }
                this._cachedScaleForStroking[0] = r, this._cachedScaleForStroking[1] = a;
            }
            return this._cachedScaleForStroking;
        }
        rescaleAndStroke(t) {
            const { ctx: e } = this, { lineWidth: s } = this.current, [i, n] = this.getScaleForStroking();
            if (e.lineWidth = s || 1, i === 1 && n === 1) {
                e.stroke();
                return;
            }
            const r = e.getLineDash();
            if (t && e.save(), e.scale(i, n), r.length > 0) {
                const a = Math.max(i, n);
                e.setLineDash(r.map((o)=>o / a)), e.lineDashOffset /= a;
            }
            e.stroke(), t && e.restore();
        }
        isContentVisible() {
            for(let t = this.markedContentStack.length - 1; t >= 0; t--)if (!this.markedContentStack[t].visible) return !1;
            return !0;
        }
    }
    for(const c in wt)Ut.prototype[c] !== void 0 && (Ut.prototype[wt[c]] = Ut.prototype[c]);
    class te {
        static #t = null;
        static #e = "";
        static get workerPort() {
            return this.#t;
        }
        static set workerPort(t) {
            if (!(typeof Worker < "u" && t instanceof Worker) && t !== null) throw new Error("Invalid `workerPort` type.");
            this.#t = t;
        }
        static get workerSrc() {
            return this.#e;
        }
        static set workerSrc(t) {
            if (typeof t != "string") throw new Error("Invalid `workerSrc` type.");
            this.#e = t;
        }
    }
    class tn {
        #t;
        #e;
        constructor({ parsedData: t, rawData: e }){
            this.#t = t, this.#e = e;
        }
        getRaw() {
            return this.#e;
        }
        get(t) {
            return this.#t.get(t) ?? null;
        }
        getAll() {
            return ze(this.#t);
        }
        has(t) {
            return this.#t.has(t);
        }
    }
    const Gt = Symbol("INTERNAL");
    class en {
        #t = !1;
        #e = !1;
        #s = !1;
        #i = !0;
        constructor(t, { name: e, intent: s, usage: i, rbGroups: n }){
            this.#t = !!(t & gt.DISPLAY), this.#e = !!(t & gt.PRINT), this.name = e, this.intent = s, this.usage = i, this.rbGroups = n;
        }
        get visible() {
            if (this.#s) return this.#i;
            if (!this.#i) return !1;
            const { print: t, view: e } = this.usage;
            return this.#t ? e?.viewState !== "OFF" : this.#e ? t?.printState !== "OFF" : !0;
        }
        _setVisible(t, e, s = !1) {
            t !== Gt && V("Internal method `_setVisible` called."), this.#s = s, this.#i = e;
        }
    }
    class sn {
        #t = null;
        #e = new Map;
        #s = null;
        #i = null;
        constructor(t, e = gt.DISPLAY){
            if (this.renderingIntent = e, this.name = null, this.creator = null, t !== null) {
                this.name = t.name, this.creator = t.creator, this.#i = t.order;
                for (const s of t.groups)this.#e.set(s.id, new en(e, s));
                if (t.baseState === "OFF") for (const s of this.#e.values())s._setVisible(Gt, !1);
                for (const s of t.on)this.#e.get(s)._setVisible(Gt, !0);
                for (const s of t.off)this.#e.get(s)._setVisible(Gt, !1);
                this.#s = this.getHash();
            }
        }
        #r(t) {
            const e = t.length;
            if (e < 2) return !0;
            const s = t[0];
            for(let i = 1; i < e; i++){
                const n = t[i];
                let r;
                if (Array.isArray(n)) r = this.#r(n);
                else if (this.#e.has(n)) r = this.#e.get(n).visible;
                else return N(`Optional content group not found: ${n}`), !0;
                switch(s){
                    case "And":
                        if (!r) return !1;
                        break;
                    case "Or":
                        if (r) return !0;
                        break;
                    case "Not":
                        return !r;
                    default:
                        return !0;
                }
            }
            return s === "And";
        }
        isVisible(t) {
            if (this.#e.size === 0) return !0;
            if (!t) return be("Optional content group not defined."), !0;
            if (t.type === "OCG") return this.#e.has(t.id) ? this.#e.get(t.id).visible : (N(`Optional content group not found: ${t.id}`), !0);
            if (t.type === "OCMD") {
                if (t.expression) return this.#r(t.expression);
                if (!t.policy || t.policy === "AnyOn") {
                    for (const e of t.ids){
                        if (!this.#e.has(e)) return N(`Optional content group not found: ${e}`), !0;
                        if (this.#e.get(e).visible) return !0;
                    }
                    return !1;
                } else if (t.policy === "AllOn") {
                    for (const e of t.ids){
                        if (!this.#e.has(e)) return N(`Optional content group not found: ${e}`), !0;
                        if (!this.#e.get(e).visible) return !1;
                    }
                    return !0;
                } else if (t.policy === "AnyOff") {
                    for (const e of t.ids){
                        if (!this.#e.has(e)) return N(`Optional content group not found: ${e}`), !0;
                        if (!this.#e.get(e).visible) return !0;
                    }
                    return !1;
                } else if (t.policy === "AllOff") {
                    for (const e of t.ids){
                        if (!this.#e.has(e)) return N(`Optional content group not found: ${e}`), !0;
                        if (this.#e.get(e).visible) return !1;
                    }
                    return !0;
                }
                return N(`Unknown optional content policy ${t.policy}.`), !0;
            }
            return N(`Unknown group type ${t.type}.`), !0;
        }
        setVisibility(t, e = !0, s = !0) {
            const i = this.#e.get(t);
            if (!i) {
                N(`Optional content group not found: ${t}`);
                return;
            }
            if (s && e && i.rbGroups.length) for (const n of i.rbGroups)for (const r of n)r !== t && this.#e.get(r)?._setVisible(Gt, !1, !0);
            i._setVisible(Gt, !!e, !0), this.#t = null;
        }
        setOCGState({ state: t, preserveRB: e }) {
            let s;
            for (const i of t){
                switch(i){
                    case "ON":
                    case "OFF":
                    case "Toggle":
                        s = i;
                        continue;
                }
                const n = this.#e.get(i);
                if (n) switch(s){
                    case "ON":
                        this.setVisibility(i, !0, e);
                        break;
                    case "OFF":
                        this.setVisibility(i, !1, e);
                        break;
                    case "Toggle":
                        this.setVisibility(i, !n.visible, e);
                        break;
                }
            }
            this.#t = null;
        }
        get hasInitialVisibility() {
            return this.#s === null || this.getHash() === this.#s;
        }
        getOrder() {
            return this.#e.size ? this.#i ? this.#i.slice() : [
                ...this.#e.keys()
            ] : null;
        }
        getGroups() {
            return this.#e.size > 0 ? ze(this.#e) : null;
        }
        getGroup(t) {
            return this.#e.get(t) || null;
        }
        getHash() {
            if (this.#t !== null) return this.#t;
            const t = new Ps;
            for (const [e, s] of this.#e)t.update(`${e}:${s.visible}`);
            return this.#t = t.hexdigest();
        }
    }
    class nn {
        constructor(t, { disableRange: e = !1, disableStream: s = !1 }){
            tt(t, 'PDFDataTransportStream - missing required "pdfDataRangeTransport" argument.');
            const { length: i, initialData: n, progressiveDone: r, contentDispositionFilename: a } = t;
            if (this._queuedChunks = [], this._progressiveDone = r, this._contentDispositionFilename = a, n?.length > 0) {
                const o = n instanceof Uint8Array && n.byteLength === n.buffer.byteLength ? n.buffer : new Uint8Array(n).buffer;
                this._queuedChunks.push(o);
            }
            this._pdfDataRangeTransport = t, this._isStreamingSupported = !s, this._isRangeSupported = !e, this._contentLength = i, this._fullRequestReader = null, this._rangeReaders = [], t.addRangeListener((o, l)=>{
                this._onReceiveData({
                    begin: o,
                    chunk: l
                });
            }), t.addProgressListener((o, l)=>{
                this._onProgress({
                    loaded: o,
                    total: l
                });
            }), t.addProgressiveReadListener((o)=>{
                this._onReceiveData({
                    chunk: o
                });
            }), t.addProgressiveDoneListener(()=>{
                this._onProgressiveDone();
            }), t.transportReady();
        }
        _onReceiveData({ begin: t, chunk: e }) {
            const s = e instanceof Uint8Array && e.byteLength === e.buffer.byteLength ? e.buffer : new Uint8Array(e).buffer;
            if (t === void 0) this._fullRequestReader ? this._fullRequestReader._enqueue(s) : this._queuedChunks.push(s);
            else {
                const i = this._rangeReaders.some(function(n) {
                    return n._begin !== t ? !1 : (n._enqueue(s), !0);
                });
                tt(i, "_onReceiveData - no `PDFDataTransportStreamRangeReader` instance found.");
            }
        }
        get _progressiveDataLength() {
            return this._fullRequestReader?._loaded ?? 0;
        }
        _onProgress(t) {
            t.total === void 0 ? this._rangeReaders[0]?.onProgress?.({
                loaded: t.loaded
            }) : this._fullRequestReader?.onProgress?.({
                loaded: t.loaded,
                total: t.total
            });
        }
        _onProgressiveDone() {
            this._fullRequestReader?.progressiveDone(), this._progressiveDone = !0;
        }
        _removeRangeReader(t) {
            const e = this._rangeReaders.indexOf(t);
            e >= 0 && this._rangeReaders.splice(e, 1);
        }
        getFullReader() {
            tt(!this._fullRequestReader, "PDFDataTransportStream.getFullReader can only be called once.");
            const t = this._queuedChunks;
            return this._queuedChunks = null, new rn(this, t, this._progressiveDone, this._contentDispositionFilename);
        }
        getRangeReader(t, e) {
            if (e <= this._progressiveDataLength) return null;
            const s = new an(this, t, e);
            return this._pdfDataRangeTransport.requestDataRange(t, e), this._rangeReaders.push(s), s;
        }
        cancelAllRequests(t) {
            this._fullRequestReader?.cancel(t);
            for (const e of this._rangeReaders.slice(0))e.cancel(t);
            this._pdfDataRangeTransport.abort();
        }
    }
    class rn {
        constructor(t, e, s = !1, i = null){
            this._stream = t, this._done = s || !1, this._filename = Ue(i) ? i : null, this._queuedChunks = e || [], this._loaded = 0;
            for (const n of this._queuedChunks)this._loaded += n.byteLength;
            this._requests = [], this._headersReady = Promise.resolve(), t._fullRequestReader = this, this.onProgress = null;
        }
        _enqueue(t) {
            this._done || (this._requests.length > 0 ? this._requests.shift().resolve({
                value: t,
                done: !1
            }) : this._queuedChunks.push(t), this._loaded += t.byteLength);
        }
        get headersReady() {
            return this._headersReady;
        }
        get filename() {
            return this._filename;
        }
        get isRangeSupported() {
            return this._stream._isRangeSupported;
        }
        get isStreamingSupported() {
            return this._stream._isStreamingSupported;
        }
        get contentLength() {
            return this._stream._contentLength;
        }
        async read() {
            if (this._queuedChunks.length > 0) return {
                value: this._queuedChunks.shift(),
                done: !1
            };
            if (this._done) return {
                value: void 0,
                done: !0
            };
            const t = Promise.withResolvers();
            return this._requests.push(t), t.promise;
        }
        cancel(t) {
            this._done = !0;
            for (const e of this._requests)e.resolve({
                value: void 0,
                done: !0
            });
            this._requests.length = 0;
        }
        progressiveDone() {
            this._done || (this._done = !0);
        }
    }
    class an {
        constructor(t, e, s){
            this._stream = t, this._begin = e, this._end = s, this._queuedChunk = null, this._requests = [], this._done = !1, this.onProgress = null;
        }
        _enqueue(t) {
            if (!this._done) {
                if (this._requests.length === 0) this._queuedChunk = t;
                else {
                    this._requests.shift().resolve({
                        value: t,
                        done: !1
                    });
                    for (const s of this._requests)s.resolve({
                        value: void 0,
                        done: !0
                    });
                    this._requests.length = 0;
                }
                this._done = !0, this._stream._removeRangeReader(this);
            }
        }
        get isStreamingSupported() {
            return !1;
        }
        async read() {
            if (this._queuedChunk) {
                const e = this._queuedChunk;
                return this._queuedChunk = null, {
                    value: e,
                    done: !1
                };
            }
            if (this._done) return {
                value: void 0,
                done: !0
            };
            const t = Promise.withResolvers();
            return this._requests.push(t), t.promise;
        }
        cancel(t) {
            this._done = !0;
            for (const e of this._requests)e.resolve({
                value: void 0,
                done: !0
            });
            this._requests.length = 0, this._stream._removeRangeReader(this);
        }
    }
    function on(c) {
        let t = !0, e = s("filename\\*", "i").exec(c);
        if (e) {
            e = e[1];
            let h = a(e);
            return h = unescape(h), h = o(h), h = l(h), n(h);
        }
        if (e = r(c), e) {
            const h = l(e);
            return n(h);
        }
        if (e = s("filename", "i").exec(c), e) {
            e = e[1];
            let h = a(e);
            return h = l(h), n(h);
        }
        function s(h, d) {
            return new RegExp("(?:^|;)\\s*" + h + '\\s*=\\s*([^";\\s][^;\\s]*|"(?:[^"\\\\]|\\\\"?)+"?)', d);
        }
        function i(h, d) {
            if (h) {
                if (!/^[\x00-\xFF]+$/.test(d)) return d;
                try {
                    const u = new TextDecoder(h, {
                        fatal: !0
                    }), f = Ae(d);
                    d = u.decode(f), t = !1;
                } catch  {}
            }
            return d;
        }
        function n(h) {
            return t && /[\x80-\xff]/.test(h) && (h = i("utf-8", h), t && (h = i("iso-8859-1", h))), h;
        }
        function r(h) {
            const d = [];
            let u;
            const f = s("filename\\*((?!0\\d)\\d+)(\\*?)", "ig");
            for(; (u = f.exec(h)) !== null;){
                let [, g, b, m] = u;
                if (g = parseInt(g, 10), g in d) {
                    if (g === 0) break;
                    continue;
                }
                d[g] = [
                    b,
                    m
                ];
            }
            const p = [];
            for(let g = 0; g < d.length && g in d; ++g){
                let [b, m] = d[g];
                m = a(m), b && (m = unescape(m), g === 0 && (m = o(m))), p.push(m);
            }
            return p.join("");
        }
        function a(h) {
            if (h.startsWith('"')) {
                const d = h.slice(1).split('\\"');
                for(let u = 0; u < d.length; ++u){
                    const f = d[u].indexOf('"');
                    f !== -1 && (d[u] = d[u].slice(0, f), d.length = u + 1), d[u] = d[u].replaceAll(/\\(.)/g, "$1");
                }
                h = d.join('"');
            }
            return h;
        }
        function o(h) {
            const d = h.indexOf("'");
            if (d === -1) return h;
            const u = h.slice(0, d), p = h.slice(d + 1).replace(/^[^']*'/, "");
            return i(u, p);
        }
        function l(h) {
            return !h.startsWith("=?") || /[\x00-\x19\x80-\xff]/.test(h) ? h : h.replaceAll(/=\?([\w-]*)\?([QqBb])\?((?:[^?]|\?(?!=))*)\?=/g, function(d, u, f, p) {
                if (f === "q" || f === "Q") return p = p.replaceAll("_", " "), p = p.replaceAll(/=([0-9a-fA-F]{2})/g, function(g, b) {
                    return String.fromCharCode(parseInt(b, 16));
                }), i(u, p);
                try {
                    p = atob(p);
                } catch  {}
                return i(u, p);
            });
        }
        return "";
    }
    function Os(c, t) {
        const e = new Headers;
        if (!c || !t || typeof t != "object") return e;
        for(const s in t){
            const i = t[s];
            i !== void 0 && e.append(s, i);
        }
        return e;
    }
    function _e(c) {
        try {
            return new URL(c).origin;
        } catch  {}
        return null;
    }
    function Bs({ responseHeaders: c, isHttp: t, rangeChunkSize: e, disableRange: s }) {
        const i = {
            allowRangeRequests: !1,
            suggestedLength: void 0
        }, n = parseInt(c.get("Content-Length"), 10);
        return !Number.isInteger(n) || (i.suggestedLength = n, n <= 2 * e) || s || !t || c.get("Accept-Ranges") !== "bytes" || (c.get("Content-Encoding") || "identity") !== "identity" || (i.allowRangeRequests = !0), i;
    }
    function Hs(c) {
        const t = c.get("Content-Disposition");
        if (t) {
            let e = on(t);
            if (e.includes("%")) try {
                e = decodeURIComponent(e);
            } catch  {}
            if (Ue(e)) return e;
        }
        return null;
    }
    function Se(c, t) {
        return c === 404 || c === 0 && t.startsWith("file:") ? new ee('Missing PDF "' + t + '".') : new fe(`Unexpected server response (${c}) while retrieving PDF "${t}".`, c);
    }
    function $s(c) {
        return c === 200 || c === 206;
    }
    function zs(c, t, e) {
        return {
            method: "GET",
            headers: c,
            signal: e.signal,
            mode: "cors",
            credentials: t ? "include" : "same-origin",
            redirect: "follow"
        };
    }
    function Gs(c) {
        return c instanceof Uint8Array ? c.buffer : c instanceof ArrayBuffer ? c : (N(`getArrayBuffer - unexpected data format: ${c}`), new Uint8Array(c).buffer);
    }
    class ws {
        _responseOrigin = null;
        constructor(t){
            this.source = t, this.isHttp = /^https?:/i.test(t.url), this.headers = Os(this.isHttp, t.httpHeaders), this._fullRequestReader = null, this._rangeRequestReaders = [];
        }
        get _progressiveDataLength() {
            return this._fullRequestReader?._loaded ?? 0;
        }
        getFullReader() {
            return tt(!this._fullRequestReader, "PDFFetchStream.getFullReader can only be called once."), this._fullRequestReader = new ln(this), this._fullRequestReader;
        }
        getRangeReader(t, e) {
            if (e <= this._progressiveDataLength) return null;
            const s = new hn(this, t, e);
            return this._rangeRequestReaders.push(s), s;
        }
        cancelAllRequests(t) {
            this._fullRequestReader?.cancel(t);
            for (const e of this._rangeRequestReaders.slice(0))e.cancel(t);
        }
    }
    class ln {
        constructor(t){
            this._stream = t, this._reader = null, this._loaded = 0, this._filename = null;
            const e = t.source;
            this._withCredentials = e.withCredentials || !1, this._contentLength = e.length, this._headersCapability = Promise.withResolvers(), this._disableRange = e.disableRange || !1, this._rangeChunkSize = e.rangeChunkSize, !this._rangeChunkSize && !this._disableRange && (this._disableRange = !0), this._abortController = new AbortController, this._isStreamingSupported = !e.disableStream, this._isRangeSupported = !e.disableRange;
            const s = new Headers(t.headers), i = e.url;
            fetch(i, zs(s, this._withCredentials, this._abortController)).then((n)=>{
                if (t._responseOrigin = _e(n.url), !$s(n.status)) throw Se(n.status, i);
                this._reader = n.body.getReader(), this._headersCapability.resolve();
                const r = n.headers, { allowRangeRequests: a, suggestedLength: o } = Bs({
                    responseHeaders: r,
                    isHttp: t.isHttp,
                    rangeChunkSize: this._rangeChunkSize,
                    disableRange: this._disableRange
                });
                this._isRangeSupported = a, this._contentLength = o || this._contentLength, this._filename = Hs(r), !this._isStreamingSupported && this._isRangeSupported && this.cancel(new Lt("Streaming is disabled."));
            }).catch(this._headersCapability.reject), this.onProgress = null;
        }
        get headersReady() {
            return this._headersCapability.promise;
        }
        get filename() {
            return this._filename;
        }
        get contentLength() {
            return this._contentLength;
        }
        get isRangeSupported() {
            return this._isRangeSupported;
        }
        get isStreamingSupported() {
            return this._isStreamingSupported;
        }
        async read() {
            await this._headersCapability.promise;
            const { value: t, done: e } = await this._reader.read();
            return e ? {
                value: t,
                done: e
            } : (this._loaded += t.byteLength, this.onProgress?.({
                loaded: this._loaded,
                total: this._contentLength
            }), {
                value: Gs(t),
                done: !1
            });
        }
        cancel(t) {
            this._reader?.cancel(t), this._abortController.abort();
        }
    }
    class hn {
        constructor(t, e, s){
            this._stream = t, this._reader = null, this._loaded = 0;
            const i = t.source;
            this._withCredentials = i.withCredentials || !1, this._readCapability = Promise.withResolvers(), this._isStreamingSupported = !i.disableStream, this._abortController = new AbortController;
            const n = new Headers(t.headers);
            n.append("Range", `bytes=${e}-${s - 1}`);
            const r = i.url;
            fetch(r, zs(n, this._withCredentials, this._abortController)).then((a)=>{
                const o = _e(a.url);
                if (o !== t._responseOrigin) throw new Error(`Expected range response-origin "${o}" to match "${t._responseOrigin}".`);
                if (!$s(a.status)) throw Se(a.status, r);
                this._readCapability.resolve(), this._reader = a.body.getReader();
            }).catch(this._readCapability.reject), this.onProgress = null;
        }
        get isStreamingSupported() {
            return this._isStreamingSupported;
        }
        async read() {
            await this._readCapability.promise;
            const { value: t, done: e } = await this._reader.read();
            return e ? {
                value: t,
                done: e
            } : (this._loaded += t.byteLength, this.onProgress?.({
                loaded: this._loaded
            }), {
                value: Gs(t),
                done: !1
            });
        }
        cancel(t) {
            this._reader?.cancel(t), this._abortController.abort();
        }
    }
    const ke = 200, Ie = 206;
    function cn(c) {
        const t = c.response;
        return typeof t != "string" ? t : Ae(t).buffer;
    }
    class dn {
        _responseOrigin = null;
        constructor({ url: t, httpHeaders: e, withCredentials: s }){
            this.url = t, this.isHttp = /^https?:/i.test(t), this.headers = Os(this.isHttp, e), this.withCredentials = s || !1, this.currXhrId = 0, this.pendingRequests = Object.create(null);
        }
        request(t) {
            const e = new XMLHttpRequest, s = this.currXhrId++, i = this.pendingRequests[s] = {
                xhr: e
            };
            e.open("GET", this.url), e.withCredentials = this.withCredentials;
            for (const [n, r] of this.headers)e.setRequestHeader(n, r);
            return this.isHttp && "begin" in t && "end" in t ? (e.setRequestHeader("Range", `bytes=${t.begin}-${t.end - 1}`), i.expectedStatus = Ie) : i.expectedStatus = ke, e.responseType = "arraybuffer", tt(t.onError, "Expected `onError` callback to be provided."), e.onerror = ()=>{
                t.onError(e.status);
            }, e.onreadystatechange = this.onStateChange.bind(this, s), e.onprogress = this.onProgress.bind(this, s), i.onHeadersReceived = t.onHeadersReceived, i.onDone = t.onDone, i.onError = t.onError, i.onProgress = t.onProgress, e.send(null), s;
        }
        onProgress(t, e) {
            const s = this.pendingRequests[t];
            s && s.onProgress?.(e);
        }
        onStateChange(t, e) {
            const s = this.pendingRequests[t];
            if (!s) return;
            const i = s.xhr;
            if (i.readyState >= 2 && s.onHeadersReceived && (s.onHeadersReceived(), delete s.onHeadersReceived), i.readyState !== 4 || !(t in this.pendingRequests)) return;
            if (delete this.pendingRequests[t], i.status === 0 && this.isHttp) {
                s.onError(i.status);
                return;
            }
            const n = i.status || ke;
            if (!(n === ke && s.expectedStatus === Ie) && n !== s.expectedStatus) {
                s.onError(i.status);
                return;
            }
            const a = cn(i);
            if (n === Ie) {
                const o = i.getResponseHeader("Content-Range"), l = /bytes (\d+)-(\d+)\/(\d+)/.exec(o);
                l ? s.onDone({
                    begin: parseInt(l[1], 10),
                    chunk: a
                }) : (N('Missing or invalid "Content-Range" header.'), s.onError(0));
            } else a ? s.onDone({
                begin: 0,
                chunk: a
            }) : s.onError(i.status);
        }
        getRequestXhr(t) {
            return this.pendingRequests[t].xhr;
        }
        isPendingRequest(t) {
            return t in this.pendingRequests;
        }
        abortRequest(t) {
            const e = this.pendingRequests[t].xhr;
            delete this.pendingRequests[t], e.abort();
        }
    }
    class un {
        constructor(t){
            this._source = t, this._manager = new dn(t), this._rangeChunkSize = t.rangeChunkSize, this._fullRequestReader = null, this._rangeRequestReaders = [];
        }
        _onRangeRequestReaderClosed(t) {
            const e = this._rangeRequestReaders.indexOf(t);
            e >= 0 && this._rangeRequestReaders.splice(e, 1);
        }
        getFullReader() {
            return tt(!this._fullRequestReader, "PDFNetworkStream.getFullReader can only be called once."), this._fullRequestReader = new fn(this._manager, this._source), this._fullRequestReader;
        }
        getRangeReader(t, e) {
            const s = new pn(this._manager, t, e);
            return s.onClosed = this._onRangeRequestReaderClosed.bind(this), this._rangeRequestReaders.push(s), s;
        }
        cancelAllRequests(t) {
            this._fullRequestReader?.cancel(t);
            for (const e of this._rangeRequestReaders.slice(0))e.cancel(t);
        }
    }
    class fn {
        constructor(t, e){
            this._manager = t, this._url = e.url, this._fullRequestId = t.request({
                onHeadersReceived: this._onHeadersReceived.bind(this),
                onDone: this._onDone.bind(this),
                onError: this._onError.bind(this),
                onProgress: this._onProgress.bind(this)
            }), this._headersCapability = Promise.withResolvers(), this._disableRange = e.disableRange || !1, this._contentLength = e.length, this._rangeChunkSize = e.rangeChunkSize, !this._rangeChunkSize && !this._disableRange && (this._disableRange = !0), this._isStreamingSupported = !1, this._isRangeSupported = !1, this._cachedChunks = [], this._requests = [], this._done = !1, this._storedError = void 0, this._filename = null, this.onProgress = null;
        }
        _onHeadersReceived() {
            const t = this._fullRequestId, e = this._manager.getRequestXhr(t);
            this._manager._responseOrigin = _e(e.responseURL);
            const s = e.getAllResponseHeaders(), i = new Headers(s ? s.trimStart().replace(/[^\S ]+$/, "").split(/[\r\n]+/).map((a)=>{
                const [o, ...l] = a.split(": ");
                return [
                    o,
                    l.join(": ")
                ];
            }) : []), { allowRangeRequests: n, suggestedLength: r } = Bs({
                responseHeaders: i,
                isHttp: this._manager.isHttp,
                rangeChunkSize: this._rangeChunkSize,
                disableRange: this._disableRange
            });
            n && (this._isRangeSupported = !0), this._contentLength = r || this._contentLength, this._filename = Hs(i), this._isRangeSupported && this._manager.abortRequest(t), this._headersCapability.resolve();
        }
        _onDone(t) {
            if (t && (this._requests.length > 0 ? this._requests.shift().resolve({
                value: t.chunk,
                done: !1
            }) : this._cachedChunks.push(t.chunk)), this._done = !0, !(this._cachedChunks.length > 0)) {
                for (const e of this._requests)e.resolve({
                    value: void 0,
                    done: !0
                });
                this._requests.length = 0;
            }
        }
        _onError(t) {
            this._storedError = Se(t, this._url), this._headersCapability.reject(this._storedError);
            for (const e of this._requests)e.reject(this._storedError);
            this._requests.length = 0, this._cachedChunks.length = 0;
        }
        _onProgress(t) {
            this.onProgress?.({
                loaded: t.loaded,
                total: t.lengthComputable ? t.total : this._contentLength
            });
        }
        get filename() {
            return this._filename;
        }
        get isRangeSupported() {
            return this._isRangeSupported;
        }
        get isStreamingSupported() {
            return this._isStreamingSupported;
        }
        get contentLength() {
            return this._contentLength;
        }
        get headersReady() {
            return this._headersCapability.promise;
        }
        async read() {
            if (await this._headersCapability.promise, this._storedError) throw this._storedError;
            if (this._cachedChunks.length > 0) return {
                value: this._cachedChunks.shift(),
                done: !1
            };
            if (this._done) return {
                value: void 0,
                done: !0
            };
            const t = Promise.withResolvers();
            return this._requests.push(t), t.promise;
        }
        cancel(t) {
            this._done = !0, this._headersCapability.reject(t);
            for (const e of this._requests)e.resolve({
                value: void 0,
                done: !0
            });
            this._requests.length = 0, this._manager.isPendingRequest(this._fullRequestId) && this._manager.abortRequest(this._fullRequestId), this._fullRequestReader = null;
        }
    }
    class pn {
        constructor(t, e, s){
            this._manager = t, this._url = t.url, this._requestId = t.request({
                begin: e,
                end: s,
                onHeadersReceived: this._onHeadersReceived.bind(this),
                onDone: this._onDone.bind(this),
                onError: this._onError.bind(this),
                onProgress: this._onProgress.bind(this)
            }), this._requests = [], this._queuedChunk = null, this._done = !1, this._storedError = void 0, this.onProgress = null, this.onClosed = null;
        }
        _onHeadersReceived() {
            const t = _e(this._manager.getRequestXhr(this._requestId)?.responseURL);
            t !== this._manager._responseOrigin && (this._storedError = new Error(`Expected range response-origin "${t}" to match "${this._manager._responseOrigin}".`), this._onError(0));
        }
        _close() {
            this.onClosed?.(this);
        }
        _onDone(t) {
            const e = t.chunk;
            this._requests.length > 0 ? this._requests.shift().resolve({
                value: e,
                done: !1
            }) : this._queuedChunk = e, this._done = !0;
            for (const s of this._requests)s.resolve({
                value: void 0,
                done: !0
            });
            this._requests.length = 0, this._close();
        }
        _onError(t) {
            this._storedError ??= Se(t, this._url);
            for (const e of this._requests)e.reject(this._storedError);
            this._requests.length = 0, this._queuedChunk = null;
        }
        _onProgress(t) {
            this.isStreamingSupported || this.onProgress?.({
                loaded: t.loaded
            });
        }
        get isStreamingSupported() {
            return !1;
        }
        async read() {
            if (this._storedError) throw this._storedError;
            if (this._queuedChunk !== null) {
                const e = this._queuedChunk;
                return this._queuedChunk = null, {
                    value: e,
                    done: !1
                };
            }
            if (this._done) return {
                value: void 0,
                done: !0
            };
            const t = Promise.withResolvers();
            return this._requests.push(t), t.promise;
        }
        cancel(t) {
            this._done = !0;
            for (const e of this._requests)e.resolve({
                value: void 0,
                done: !0
            });
            this._requests.length = 0, this._manager.isPendingRequest(this._requestId) && this._manager.abortRequest(this._requestId), this._close();
        }
    }
    const gn = /^[a-z][a-z0-9\-+.]+:/i;
    function mn(c) {
        if (gn.test(c)) return new URL(c);
        const t = process.getBuiltinModule("url");
        return new URL(t.pathToFileURL(c));
    }
    class bn {
        constructor(t){
            this.source = t, this.url = mn(t.url), tt(this.url.protocol === "file:", "PDFNodeStream only supports file:// URLs."), this._fullRequestReader = null, this._rangeRequestReaders = [];
        }
        get _progressiveDataLength() {
            return this._fullRequestReader?._loaded ?? 0;
        }
        getFullReader() {
            return tt(!this._fullRequestReader, "PDFNodeStream.getFullReader can only be called once."), this._fullRequestReader = new An(this), this._fullRequestReader;
        }
        getRangeReader(t, e) {
            if (e <= this._progressiveDataLength) return null;
            const s = new yn(this, t, e);
            return this._rangeRequestReaders.push(s), s;
        }
        cancelAllRequests(t) {
            this._fullRequestReader?.cancel(t);
            for (const e of this._rangeRequestReaders.slice(0))e.cancel(t);
        }
    }
    class An {
        constructor(t){
            this._url = t.url, this._done = !1, this._storedError = null, this.onProgress = null;
            const e = t.source;
            this._contentLength = e.length, this._loaded = 0, this._filename = null, this._disableRange = e.disableRange || !1, this._rangeChunkSize = e.rangeChunkSize, !this._rangeChunkSize && !this._disableRange && (this._disableRange = !0), this._isStreamingSupported = !e.disableStream, this._isRangeSupported = !e.disableRange, this._readableStream = null, this._readCapability = Promise.withResolvers(), this._headersCapability = Promise.withResolvers();
            const s = process.getBuiltinModule("fs");
            s.promises.lstat(this._url).then((i)=>{
                this._contentLength = i.size, this._setReadableStream(s.createReadStream(this._url)), this._headersCapability.resolve();
            }, (i)=>{
                i.code === "ENOENT" && (i = new ee(`Missing PDF "${this._url}".`)), this._storedError = i, this._headersCapability.reject(i);
            });
        }
        get headersReady() {
            return this._headersCapability.promise;
        }
        get filename() {
            return this._filename;
        }
        get contentLength() {
            return this._contentLength;
        }
        get isRangeSupported() {
            return this._isRangeSupported;
        }
        get isStreamingSupported() {
            return this._isStreamingSupported;
        }
        async read() {
            if (await this._readCapability.promise, this._done) return {
                value: void 0,
                done: !0
            };
            if (this._storedError) throw this._storedError;
            const t = this._readableStream.read();
            return t === null ? (this._readCapability = Promise.withResolvers(), this.read()) : (this._loaded += t.length, this.onProgress?.({
                loaded: this._loaded,
                total: this._contentLength
            }), {
                value: new Uint8Array(t).buffer,
                done: !1
            });
        }
        cancel(t) {
            if (!this._readableStream) {
                this._error(t);
                return;
            }
            this._readableStream.destroy(t);
        }
        _error(t) {
            this._storedError = t, this._readCapability.resolve();
        }
        _setReadableStream(t) {
            this._readableStream = t, t.on("readable", ()=>{
                this._readCapability.resolve();
            }), t.on("end", ()=>{
                t.destroy(), this._done = !0, this._readCapability.resolve();
            }), t.on("error", (e)=>{
                this._error(e);
            }), !this._isStreamingSupported && this._isRangeSupported && this._error(new Lt("streaming is disabled")), this._storedError && this._readableStream.destroy(this._storedError);
        }
    }
    class yn {
        constructor(t, e, s){
            this._url = t.url, this._done = !1, this._storedError = null, this.onProgress = null, this._loaded = 0, this._readableStream = null, this._readCapability = Promise.withResolvers();
            const i = t.source;
            this._isStreamingSupported = !i.disableStream;
            const n = process.getBuiltinModule("fs");
            this._setReadableStream(n.createReadStream(this._url, {
                start: e,
                end: s - 1
            }));
        }
        get isStreamingSupported() {
            return this._isStreamingSupported;
        }
        async read() {
            if (await this._readCapability.promise, this._done) return {
                value: void 0,
                done: !0
            };
            if (this._storedError) throw this._storedError;
            const t = this._readableStream.read();
            return t === null ? (this._readCapability = Promise.withResolvers(), this.read()) : (this._loaded += t.length, this.onProgress?.({
                loaded: this._loaded
            }), {
                value: new Uint8Array(t).buffer,
                done: !1
            });
        }
        cancel(t) {
            if (!this._readableStream) {
                this._error(t);
                return;
            }
            this._readableStream.destroy(t);
        }
        _error(t) {
            this._storedError = t, this._readCapability.resolve();
        }
        _setReadableStream(t) {
            this._readableStream = t, t.on("readable", ()=>{
                this._readCapability.resolve();
            }), t.on("end", ()=>{
                t.destroy(), this._done = !0, this._readCapability.resolve();
            }), t.on("error", (e)=>{
                this._error(e);
            }), this._storedError && this._readableStream.destroy(this._storedError);
        }
    }
    const vn = 1e5, ut = 30, wn = .8;
    class ct {
        #t = Promise.withResolvers();
        #e = null;
        #s = !1;
        #i = !!globalThis.FontInspector?.enabled;
        #r = null;
        #n = null;
        #l = 0;
        #o = 0;
        #c = null;
        #h = null;
        #u = 0;
        #d = 0;
        #f = Object.create(null);
        #a = [];
        #p = null;
        #m = [];
        #g = new WeakMap;
        #b = null;
        static #v = new Map;
        static #A = new Map;
        static #w = new WeakMap;
        static #S = null;
        static #x = new Set;
        constructor({ textContentSource: t, container: e, viewport: s }){
            if (t instanceof ReadableStream) this.#p = t;
            else if (typeof t == "object") this.#p = new ReadableStream({
                start (o) {
                    o.enqueue(t), o.close();
                }
            });
            else throw new Error('No "textContentSource" parameter specified.');
            this.#e = this.#h = e, this.#d = s.scale * (globalThis.devicePixelRatio || 1), this.#u = s.rotation, this.#n = {
                div: null,
                properties: null,
                ctx: null
            };
            const { pageWidth: i, pageHeight: n, pageX: r, pageY: a } = s.rawDims;
            this.#b = [
                1,
                0,
                0,
                -1,
                -r,
                a + n
            ], this.#o = i, this.#l = n, ct.#k(), Ht(e, s), this.#t.promise.finally(()=>{
                ct.#x.delete(this), this.#n = null, this.#f = null;
            }).catch(()=>{});
        }
        static get fontFamilyMap() {
            const { isWindows: t, isFirefox: e } = dt.platform;
            return O(this, "fontFamilyMap", new Map([
                [
                    "sans-serif",
                    `${t && e ? "Calibri, " : ""}sans-serif`
                ],
                [
                    "monospace",
                    `${t && e ? "Lucida Console, " : ""}monospace`
                ]
            ]));
        }
        render() {
            const t = ()=>{
                this.#c.read().then(({ value: e, done: s })=>{
                    if (s) {
                        this.#t.resolve();
                        return;
                    }
                    this.#r ??= e.lang, Object.assign(this.#f, e.styles), this.#T(e.items), t();
                }, this.#t.reject);
            };
            return this.#c = this.#p.getReader(), ct.#x.add(this), t(), this.#t.promise;
        }
        update({ viewport: t, onBefore: e = null }) {
            const s = t.scale * (globalThis.devicePixelRatio || 1), i = t.rotation;
            if (i !== this.#u && (e?.(), this.#u = i, Ht(this.#h, {
                rotation: i
            })), s !== this.#d) {
                e?.(), this.#d = s;
                const n = {
                    div: null,
                    properties: null,
                    ctx: ct.#P(this.#r)
                };
                for (const r of this.#m)n.properties = this.#g.get(r), n.div = r, this.#_(n);
            }
        }
        cancel() {
            const t = new Lt("TextLayer task cancelled.");
            this.#c?.cancel(t).catch(()=>{}), this.#c = null, this.#t.reject(t);
        }
        get textDivs() {
            return this.#m;
        }
        get textContentItemsStr() {
            return this.#a;
        }
        #T(t) {
            if (this.#s) return;
            this.#n.ctx ??= ct.#P(this.#r);
            const e = this.#m, s = this.#a;
            for (const i of t){
                if (e.length > vn) {
                    N("Ignoring additional textDivs for performance reasons."), this.#s = !0;
                    return;
                }
                if (i.str === void 0) {
                    if (i.type === "beginMarkedContentProps" || i.type === "beginMarkedContent") {
                        const n = this.#e;
                        this.#e = document.createElement("span"), this.#e.classList.add("markedContent"), i.id !== null && this.#e.setAttribute("id", `${i.id}`), n.append(this.#e);
                    } else i.type === "endMarkedContent" && (this.#e = this.#e.parentNode);
                    continue;
                }
                s.push(i.str), this.#R(i);
            }
        }
        #R(t) {
            const e = document.createElement("span"), s = {
                angle: 0,
                canvasWidth: 0,
                hasText: t.str !== "",
                hasEOL: t.hasEOL,
                fontSize: 0
            };
            this.#m.push(e);
            const i = T.transform(this.#b, t.transform);
            let n = Math.atan2(i[1], i[0]);
            const r = this.#f[t.fontName];
            r.vertical && (n += Math.PI / 2);
            let a = this.#i && r.fontSubstitution || r.fontFamily;
            a = ct.fontFamilyMap.get(a) || a;
            const o = Math.hypot(i[2], i[3]), l = o * ct.#D(a, this.#r);
            let h, d;
            n === 0 ? (h = i[4], d = i[5] - l) : (h = i[4] + l * Math.sin(n), d = i[5] - l * Math.cos(n));
            const u = "calc(var(--scale-factor)*", f = e.style;
            this.#e === this.#h ? (f.left = `${(100 * h / this.#o).toFixed(2)}%`, f.top = `${(100 * d / this.#l).toFixed(2)}%`) : (f.left = `${u}${h.toFixed(2)}px)`, f.top = `${u}${d.toFixed(2)}px)`), f.fontSize = `${u}${(ct.#S * o).toFixed(2)}px)`, f.fontFamily = a, s.fontSize = o, e.setAttribute("role", "presentation"), e.textContent = t.str, e.dir = t.dir, this.#i && (e.dataset.fontName = r.fontSubstitutionLoadedName || t.fontName), n !== 0 && (s.angle = n * (180 / Math.PI));
            let p = !1;
            if (t.str.length > 1) p = !0;
            else if (t.str !== " " && t.transform[0] !== t.transform[3]) {
                const g = Math.abs(t.transform[0]), b = Math.abs(t.transform[3]);
                g !== b && Math.max(g, b) / Math.min(g, b) > 1.5 && (p = !0);
            }
            if (p && (s.canvasWidth = r.vertical ? t.height : t.width), this.#g.set(e, s), this.#n.div = e, this.#n.properties = s, this.#_(this.#n), s.hasText && this.#e.append(e), s.hasEOL) {
                const g = document.createElement("br");
                g.setAttribute("role", "presentation"), this.#e.append(g);
            }
        }
        #_(t) {
            const { div: e, properties: s, ctx: i } = t, { style: n } = e;
            let r = "";
            if (ct.#S > 1 && (r = `scale(${1 / ct.#S})`), s.canvasWidth !== 0 && s.hasText) {
                const { fontFamily: a } = n, { canvasWidth: o, fontSize: l } = s;
                ct.#C(i, l * this.#d, a);
                const { width: h } = i.measureText(e.textContent);
                h > 0 && (r = `scaleX(${o * this.#d / h}) ${r}`);
            }
            s.angle !== 0 && (r = `rotate(${s.angle}deg) ${r}`), r.length > 0 && (n.transform = r);
        }
        static cleanup() {
            if (!(this.#x.size > 0)) {
                this.#v.clear();
                for (const { canvas: t } of this.#A.values())t.remove();
                this.#A.clear();
            }
        }
        static #P(t = null) {
            let e = this.#A.get(t ||= "");
            if (!e) {
                const s = document.createElement("canvas");
                s.className = "hiddenCanvasElement", s.lang = t, document.body.append(s), e = s.getContext("2d", {
                    alpha: !1,
                    willReadFrequently: !0
                }), this.#A.set(t, e), this.#w.set(e, {
                    size: 0,
                    family: ""
                });
            }
            return e;
        }
        static #C(t, e, s) {
            const i = this.#w.get(t);
            e === i.size && s === i.family || (t.font = `${e}px ${s}`, i.size = e, i.family = s);
        }
        static #k() {
            if (this.#S !== null) return;
            const t = document.createElement("div");
            t.style.opacity = 0, t.style.lineHeight = 1, t.style.fontSize = "1px", t.style.position = "absolute", t.textContent = "X", document.body.append(t), this.#S = t.getBoundingClientRect().height, t.remove();
        }
        static #D(t, e) {
            const s = this.#v.get(t);
            if (s) return s;
            const i = this.#P(e);
            i.canvas.width = i.canvas.height = ut, this.#C(i, ut, t);
            const n = i.measureText("");
            let r = n.fontBoundingBoxAscent, a = Math.abs(n.fontBoundingBoxDescent);
            if (r) {
                const h = r / (r + a);
                return this.#v.set(t, h), i.canvas.width = i.canvas.height = 0, h;
            }
            i.strokeStyle = "red", i.clearRect(0, 0, ut, ut), i.strokeText("g", 0, 0);
            let o = i.getImageData(0, 0, ut, ut).data;
            a = 0;
            for(let h = o.length - 1 - 3; h >= 0; h -= 4)if (o[h] > 0) {
                a = Math.ceil(h / 4 / ut);
                break;
            }
            i.clearRect(0, 0, ut, ut), i.strokeText("A", 0, ut), o = i.getImageData(0, 0, ut, ut).data, r = 0;
            for(let h = 0, d = o.length; h < d; h += 4)if (o[h] > 0) {
                r = ut - Math.floor(h / 4 / ut);
                break;
            }
            i.canvas.width = i.canvas.height = 0;
            const l = r ? r / (r + a) : wn;
            return this.#v.set(t, l), l;
        }
    }
    class se {
        static textContent(t) {
            const e = [], s = {
                items: e,
                styles: Object.create(null)
            };
            function i(n) {
                if (!n) return;
                let r = null;
                const a = n.name;
                if (a === "#text") r = n.value;
                else if (se.shouldBuildText(a)) n?.attributes?.textContent ? r = n.attributes.textContent : n.value && (r = n.value);
                else return;
                if (r !== null && e.push({
                    str: r
                }), !!n.children) for (const o of n.children)i(o);
            }
            return i(t), s;
        }
        static shouldBuildText(t) {
            return !(t === "textarea" || t === "input" || t === "option" || t === "select");
        }
    }
    const _n = 65536, Sn = 100, En = 5e3, xn = lt ? Bi : Fi, Cn = lt ? Hi : Is, Tn = lt ? Oi : Ni, Pn = lt ? $i : Fs;
    function Rn(c = {}) {
        typeof c == "string" || c instanceof URL ? c = {
            url: c
        } : (c instanceof ArrayBuffer || ArrayBuffer.isView(c)) && (c = {
            data: c
        });
        const t = new Qe, { docId: e } = t, s = c.url ? Mn(c.url) : null, i = c.data ? kn(c.data) : null, n = c.httpHeaders || null, r = c.withCredentials === !0, a = c.password ?? null, o = c.range instanceof js ? c.range : null, l = Number.isInteger(c.rangeChunkSize) && c.rangeChunkSize > 0 ? c.rangeChunkSize : _n;
        let h = c.worker instanceof nt ? c.worker : null;
        const d = c.verbosity, u = typeof c.docBaseUrl == "string" && !ve(c.docBaseUrl) ? c.docBaseUrl : null, f = typeof c.cMapUrl == "string" ? c.cMapUrl : null, p = c.cMapPacked !== !1, g = c.CMapReaderFactory || Cn, b = typeof c.standardFontDataUrl == "string" ? c.standardFontDataUrl : null, m = c.StandardFontDataFactory || Pn, A = c.stopAtErrors !== !0, y = Number.isInteger(c.maxImageSize) && c.maxImageSize > -1 ? c.maxImageSize : -1, v = c.isEvalSupported !== !1, w = typeof c.isOffscreenCanvasSupported == "boolean" ? c.isOffscreenCanvasSupported : !lt, S = typeof c.isImageDecoderSupported == "boolean" ? c.isImageDecoderSupported : !lt && (dt.platform.isFirefox || !globalThis.chrome), _ = Number.isInteger(c.canvasMaxAreaInBytes) ? c.canvasMaxAreaInBytes : -1, R = typeof c.disableFontFace == "boolean" ? c.disableFontFace : lt, M = c.fontExtraProperties === !0, $ = c.enableXfa === !0, D = c.ownerDocument || globalThis.document, j = c.disableRange === !0, K = c.disableStream === !0, P = c.disableAutoFetch === !0, B = c.pdfBug === !0, E = c.CanvasFactory || xn, x = c.FilterFactory || Tn, z = c.enableHWA === !0, Y = o ? o.length : c.length ?? NaN, et = typeof c.useSystemFonts == "boolean" ? c.useSystemFonts : !lt && !R, G = typeof c.useWorkerFetch == "boolean" ? c.useWorkerFetch : g === Is && m === Fs && f && b && Kt(f, document.baseURI) && Kt(b, document.baseURI), X = null;
        fi(d);
        const W = {
            canvasFactory: new E({
                ownerDocument: D,
                enableHWA: z
            }),
            filterFactory: new x({
                docId: e,
                ownerDocument: D
            }),
            cMapReaderFactory: G ? null : new g({
                baseUrl: f,
                isCompressed: p
            }),
            standardFontDataFactory: G ? null : new m({
                baseUrl: b
            })
        };
        if (!h) {
            const rt = {
                verbosity: d,
                port: te.workerPort
            };
            h = rt.port ? nt.fromPort(rt) : new nt(rt), t._worker = h;
        }
        const Ct = {
            docId: e,
            apiVersion: "4.10.38",
            data: i,
            password: a,
            disableAutoFetch: P,
            rangeChunkSize: l,
            length: Y,
            docBaseUrl: u,
            enableXfa: $,
            evaluatorOptions: {
                maxImageSize: y,
                disableFontFace: R,
                ignoreErrors: A,
                isEvalSupported: v,
                isOffscreenCanvasSupported: w,
                isImageDecoderSupported: S,
                canvasMaxAreaInBytes: _,
                fontExtraProperties: M,
                useSystemFonts: et,
                cMapUrl: G ? f : null,
                standardFontDataUrl: G ? b : null
            }
        }, vt = {
            disableFontFace: R,
            fontExtraProperties: M,
            ownerDocument: D,
            pdfBug: B,
            styleElement: X,
            loadingParams: {
                disableAutoFetch: P,
                enableXfa: $
            }
        };
        return h.promise.then(function() {
            if (t.destroyed) throw new Error("Loading aborted");
            if (h.destroyed) throw new Error("Worker was destroyed");
            const rt = h.messageHandler.sendWithPromise("GetDocRequest", Ct, i ? [
                i.buffer
            ] : null);
            let U;
            if (o) U = new nn(o, {
                disableRange: j,
                disableStream: K
            });
            else if (!i) {
                if (!s) throw new Error("getDocument - no `url` parameter provided.");
                let Mt;
                if (lt) if (Kt(s)) {
                    if (typeof fetch > "u" || typeof Response > "u" || !("body" in Response.prototype)) throw new Error("getDocument - the Fetch API was disabled in Node.js, see `--no-experimental-fetch`.");
                    Mt = ws;
                } else Mt = bn;
                else Mt = Kt(s) ? ws : un;
                U = new Mt({
                    url: s,
                    length: Y,
                    httpHeaders: n,
                    withCredentials: r,
                    rangeChunkSize: l,
                    disableRange: j,
                    disableStream: K
                });
            }
            return rt.then((Mt)=>{
                if (t.destroyed) throw new Error("Loading aborted");
                if (h.destroyed) throw new Error("Worker was destroyed");
                const ae = new Qt(e, Mt, h.port), xe = new Fn(ae, t, U, vt, W);
                t._transport = xe, ae.send("Ready", null);
            });
        }).catch(t._capability.reject), t;
    }
    function Mn(c) {
        if (c instanceof URL) return c.href;
        try {
            return new URL(c, window.location).href;
        } catch  {
            if (lt && typeof c == "string") return c;
        }
        throw new Error("Invalid PDF url data: either string or URL-object is expected in the url property.");
    }
    function kn(c) {
        if (lt && typeof Buffer < "u" && c instanceof Buffer) throw new Error("Please provide binary data as `Uint8Array`, rather than `Buffer`.");
        if (c instanceof Uint8Array && c.byteLength === c.buffer.byteLength) return c;
        if (typeof c == "string") return Ae(c);
        if (c instanceof ArrayBuffer || ArrayBuffer.isView(c) || typeof c == "object" && !isNaN(c?.length)) return new Uint8Array(c);
        throw new Error("Invalid PDF binary data: either TypedArray, string, or array-like object is expected in the data property.");
    }
    function _s(c) {
        return typeof c == "object" && Number.isInteger(c?.num) && c.num >= 0 && Number.isInteger(c?.gen) && c.gen >= 0;
    }
    class Qe {
        static #t = 0;
        constructor(){
            this._capability = Promise.withResolvers(), this._transport = null, this._worker = null, this.docId = `d${Qe.#t++}`, this.destroyed = !1, this.onPassword = null, this.onProgress = null;
        }
        get promise() {
            return this._capability.promise;
        }
        async destroy() {
            this.destroyed = !0;
            try {
                this._worker?.port && (this._worker._pendingDestroy = !0), await this._transport?.destroy();
            } catch (t) {
                throw this._worker?.port && delete this._worker._pendingDestroy, t;
            }
            this._transport = null, this._worker?.destroy(), this._worker = null;
        }
    }
    class js {
        constructor(t, e, s = !1, i = null){
            this.length = t, this.initialData = e, this.progressiveDone = s, this.contentDispositionFilename = i, this._rangeListeners = [], this._progressListeners = [], this._progressiveReadListeners = [], this._progressiveDoneListeners = [], this._readyCapability = Promise.withResolvers();
        }
        addRangeListener(t) {
            this._rangeListeners.push(t);
        }
        addProgressListener(t) {
            this._progressListeners.push(t);
        }
        addProgressiveReadListener(t) {
            this._progressiveReadListeners.push(t);
        }
        addProgressiveDoneListener(t) {
            this._progressiveDoneListeners.push(t);
        }
        onDataRange(t, e) {
            for (const s of this._rangeListeners)s(t, e);
        }
        onDataProgress(t, e) {
            this._readyCapability.promise.then(()=>{
                for (const s of this._progressListeners)s(t, e);
            });
        }
        onDataProgressiveRead(t) {
            this._readyCapability.promise.then(()=>{
                for (const e of this._progressiveReadListeners)e(t);
            });
        }
        onDataProgressiveDone() {
            this._readyCapability.promise.then(()=>{
                for (const t of this._progressiveDoneListeners)t();
            });
        }
        transportReady() {
            this._readyCapability.resolve();
        }
        requestDataRange(t, e) {
            V("Abstract method PDFDataRangeTransport.requestDataRange");
        }
        abort() {}
    }
    class In {
        constructor(t, e){
            this._pdfInfo = t, this._transport = e;
        }
        get annotationStorage() {
            return this._transport.annotationStorage;
        }
        get canvasFactory() {
            return this._transport.canvasFactory;
        }
        get filterFactory() {
            return this._transport.filterFactory;
        }
        get numPages() {
            return this._pdfInfo.numPages;
        }
        get fingerprints() {
            return this._pdfInfo.fingerprints;
        }
        get isPureXfa() {
            return O(this, "isPureXfa", !!this._transport._htmlForXfa);
        }
        get allXfaHtml() {
            return this._transport._htmlForXfa;
        }
        getPage(t) {
            return this._transport.getPage(t);
        }
        getPageIndex(t) {
            return this._transport.getPageIndex(t);
        }
        getDestinations() {
            return this._transport.getDestinations();
        }
        getDestination(t) {
            return this._transport.getDestination(t);
        }
        getPageLabels() {
            return this._transport.getPageLabels();
        }
        getPageLayout() {
            return this._transport.getPageLayout();
        }
        getPageMode() {
            return this._transport.getPageMode();
        }
        getViewerPreferences() {
            return this._transport.getViewerPreferences();
        }
        getOpenAction() {
            return this._transport.getOpenAction();
        }
        getAttachments() {
            return this._transport.getAttachments();
        }
        getJSActions() {
            return this._transport.getDocJSActions();
        }
        getOutline() {
            return this._transport.getOutline();
        }
        getOptionalContentConfig({ intent: t = "display" } = {}) {
            const { renderingIntent: e } = this._transport.getRenderingIntent(t);
            return this._transport.getOptionalContentConfig(e);
        }
        getPermissions() {
            return this._transport.getPermissions();
        }
        getMetadata() {
            return this._transport.getMetadata();
        }
        getMarkInfo() {
            return this._transport.getMarkInfo();
        }
        getData() {
            return this._transport.getData();
        }
        saveDocument() {
            return this._transport.saveDocument();
        }
        getDownloadInfo() {
            return this._transport.downloadInfoCapability.promise;
        }
        cleanup(t = !1) {
            return this._transport.startCleanup(t || this.isPureXfa);
        }
        destroy() {
            return this.loadingTask.destroy();
        }
        cachedPageNumber(t) {
            return this._transport.cachedPageNumber(t);
        }
        get loadingParams() {
            return this._transport.loadingParams;
        }
        get loadingTask() {
            return this._transport.loadingTask;
        }
        getFieldObjects() {
            return this._transport.getFieldObjects();
        }
        hasJSActions() {
            return this._transport.hasJSActions();
        }
        getCalculationOrderIds() {
            return this._transport.getCalculationOrderIds();
        }
    }
    class Ln {
        #t = null;
        #e = !1;
        constructor(t, e, s, i = !1){
            this._pageIndex = t, this._pageInfo = e, this._transport = s, this._stats = i ? new ls : null, this._pdfBug = i, this.commonObjs = s.commonObjs, this.objs = new Us, this._maybeCleanupAfterRender = !1, this._intentStates = new Map, this.destroyed = !1;
        }
        get pageNumber() {
            return this._pageIndex + 1;
        }
        get rotate() {
            return this._pageInfo.rotate;
        }
        get ref() {
            return this._pageInfo.ref;
        }
        get userUnit() {
            return this._pageInfo.userUnit;
        }
        get view() {
            return this._pageInfo.view;
        }
        getViewport({ scale: t, rotation: e = this.rotate, offsetX: s = 0, offsetY: i = 0, dontFlip: n = !1 } = {}) {
            return new ie({
                viewBox: this.view,
                userUnit: this.userUnit,
                scale: t,
                rotation: e,
                offsetX: s,
                offsetY: i,
                dontFlip: n
            });
        }
        getAnnotations({ intent: t = "display" } = {}) {
            const { renderingIntent: e } = this._transport.getRenderingIntent(t);
            return this._transport.getAnnotations(this._pageIndex, e);
        }
        getJSActions() {
            return this._transport.getPageJSActions(this._pageIndex);
        }
        get filterFactory() {
            return this._transport.filterFactory;
        }
        get isPureXfa() {
            return O(this, "isPureXfa", !!this._transport._htmlForXfa);
        }
        async getXfa() {
            return this._transport._htmlForXfa?.children[this._pageIndex] || null;
        }
        render({ canvasContext: t, viewport: e, intent: s = "display", annotationMode: i = kt.ENABLE, transform: n = null, background: r = null, optionalContentConfigPromise: a = null, annotationCanvasMap: o = null, pageColors: l = null, printAnnotationStorage: h = null, isEditing: d = !1 }) {
            this._stats?.time("Overall");
            const u = this._transport.getRenderingIntent(s, i, h, d), { renderingIntent: f, cacheKey: p } = u;
            this.#e = !1, this.#i(), a ||= this._transport.getOptionalContentConfig(f);
            let g = this._intentStates.get(p);
            g || (g = Object.create(null), this._intentStates.set(p, g)), g.streamReaderCancelTimeout && (clearTimeout(g.streamReaderCancelTimeout), g.streamReaderCancelTimeout = null);
            const b = !!(f & gt.PRINT);
            g.displayReadyCapability || (g.displayReadyCapability = Promise.withResolvers(), g.operatorList = {
                fnArray: [],
                argsArray: [],
                lastChunk: !1,
                separateAnnots: null
            }, this._stats?.time("Page Request"), this._pumpOperatorList(u));
            const m = (v)=>{
                g.renderTasks.delete(A), (this._maybeCleanupAfterRender || b) && (this.#e = !0), this.#s(!b), v ? (A.capability.reject(v), this._abortOperatorList({
                    intentState: g,
                    reason: v instanceof Error ? v : new Error(v)
                })) : A.capability.resolve(), this._stats && (this._stats.timeEnd("Rendering"), this._stats.timeEnd("Overall"), globalThis.Stats?.enabled && globalThis.Stats.add(this.pageNumber, this._stats));
            }, A = new jt({
                callback: m,
                params: {
                    canvasContext: t,
                    viewport: e,
                    transform: n,
                    background: r
                },
                objs: this.objs,
                commonObjs: this.commonObjs,
                annotationCanvasMap: o,
                operatorList: g.operatorList,
                pageIndex: this._pageIndex,
                canvasFactory: this._transport.canvasFactory,
                filterFactory: this._transport.filterFactory,
                useRequestAnimationFrame: !b,
                pdfBug: this._pdfBug,
                pageColors: l
            });
            (g.renderTasks ||= new Set).add(A);
            const y = A.task;
            return Promise.all([
                g.displayReadyCapability.promise,
                a
            ]).then(([v, w])=>{
                if (this.destroyed) {
                    m();
                    return;
                }
                if (this._stats?.time("Rendering"), !(w.renderingIntent & f)) throw new Error("Must use the same `intent`-argument when calling the `PDFPageProxy.render` and `PDFDocumentProxy.getOptionalContentConfig` methods.");
                A.initializeGraphics({
                    transparency: v,
                    optionalContentConfig: w
                }), A.operatorListChanged();
            }).catch(m), y;
        }
        getOperatorList({ intent: t = "display", annotationMode: e = kt.ENABLE, printAnnotationStorage: s = null, isEditing: i = !1 } = {}) {
            function n() {
                a.operatorList.lastChunk && (a.opListReadCapability.resolve(a.operatorList), a.renderTasks.delete(o));
            }
            const r = this._transport.getRenderingIntent(t, e, s, i, !0);
            let a = this._intentStates.get(r.cacheKey);
            a || (a = Object.create(null), this._intentStates.set(r.cacheKey, a));
            let o;
            return a.opListReadCapability || (o = Object.create(null), o.operatorListChanged = n, a.opListReadCapability = Promise.withResolvers(), (a.renderTasks ||= new Set).add(o), a.operatorList = {
                fnArray: [],
                argsArray: [],
                lastChunk: !1,
                separateAnnots: null
            }, this._stats?.time("Page Request"), this._pumpOperatorList(r)), a.opListReadCapability.promise;
        }
        streamTextContent({ includeMarkedContent: t = !1, disableNormalization: e = !1 } = {}) {
            return this._transport.messageHandler.sendWithStream("GetTextContent", {
                pageIndex: this._pageIndex,
                includeMarkedContent: t === !0,
                disableNormalization: e === !0
            }, {
                highWaterMark: 100,
                size (i) {
                    return i.items.length;
                }
            });
        }
        getTextContent(t = {}) {
            if (this._transport._htmlForXfa) return this.getXfa().then((s)=>se.textContent(s));
            const e = this.streamTextContent(t);
            return new Promise(function(s, i) {
                function n() {
                    r.read().then(function({ value: o, done: l }) {
                        if (l) {
                            s(a);
                            return;
                        }
                        a.lang ??= o.lang, Object.assign(a.styles, o.styles), a.items.push(...o.items), n();
                    }, i);
                }
                const r = e.getReader(), a = {
                    items: [],
                    styles: Object.create(null),
                    lang: null
                };
                n();
            });
        }
        getStructTree() {
            return this._transport.getStructTree(this._pageIndex);
        }
        _destroy() {
            this.destroyed = !0;
            const t = [];
            for (const e of this._intentStates.values())if (this._abortOperatorList({
                intentState: e,
                reason: new Error("Page was destroyed."),
                force: !0
            }), !e.opListReadCapability) for (const s of e.renderTasks)t.push(s.completed), s.cancel();
            return this.objs.clear(), this.#e = !1, this.#i(), Promise.all(t);
        }
        cleanup(t = !1) {
            this.#e = !0;
            const e = this.#s(!1);
            return t && e && (this._stats &&= new ls), e;
        }
        #s(t = !1) {
            if (this.#i(), !this.#e || this.destroyed) return !1;
            if (t) return this.#t = setTimeout(()=>{
                this.#t = null, this.#s(!1);
            }, En), !1;
            for (const { renderTasks: e, operatorList: s } of this._intentStates.values())if (e.size > 0 || !s.lastChunk) return !1;
            return this._intentStates.clear(), this.objs.clear(), this.#e = !1, !0;
        }
        #i() {
            this.#t && (clearTimeout(this.#t), this.#t = null);
        }
        _startRenderPage(t, e) {
            const s = this._intentStates.get(e);
            s && (this._stats?.timeEnd("Page Request"), s.displayReadyCapability?.resolve(t));
        }
        _renderPageChunk(t, e) {
            for(let s = 0, i = t.length; s < i; s++)e.operatorList.fnArray.push(t.fnArray[s]), e.operatorList.argsArray.push(t.argsArray[s]);
            e.operatorList.lastChunk = t.lastChunk, e.operatorList.separateAnnots = t.separateAnnots;
            for (const s of e.renderTasks)s.operatorListChanged();
            t.lastChunk && this.#s(!0);
        }
        _pumpOperatorList({ renderingIntent: t, cacheKey: e, annotationStorageSerializable: s, modifiedIds: i }) {
            const { map: n, transfer: r } = s, o = this._transport.messageHandler.sendWithStream("GetOperatorList", {
                pageIndex: this._pageIndex,
                intent: t,
                cacheKey: e,
                annotationStorage: n,
                modifiedIds: i
            }, r).getReader(), l = this._intentStates.get(e);
            l.streamReader = o;
            const h = ()=>{
                o.read().then(({ value: d, done: u })=>{
                    if (u) {
                        l.streamReader = null;
                        return;
                    }
                    this._transport.destroyed || (this._renderPageChunk(d, l), h());
                }, (d)=>{
                    if (l.streamReader = null, !this._transport.destroyed) {
                        if (l.operatorList) {
                            l.operatorList.lastChunk = !0;
                            for (const u of l.renderTasks)u.operatorListChanged();
                            this.#s(!0);
                        }
                        if (l.displayReadyCapability) l.displayReadyCapability.reject(d);
                        else if (l.opListReadCapability) l.opListReadCapability.reject(d);
                        else throw d;
                    }
                });
            };
            h();
        }
        _abortOperatorList({ intentState: t, reason: e, force: s = !1 }) {
            if (t.streamReader) {
                if (t.streamReaderCancelTimeout && (clearTimeout(t.streamReaderCancelTimeout), t.streamReaderCancelTimeout = null), !s) {
                    if (t.renderTasks.size > 0) return;
                    if (e instanceof je) {
                        let i = Sn;
                        e.extraDelay > 0 && e.extraDelay < 1e3 && (i += e.extraDelay), t.streamReaderCancelTimeout = setTimeout(()=>{
                            t.streamReaderCancelTimeout = null, this._abortOperatorList({
                                intentState: t,
                                reason: e,
                                force: !0
                            });
                        }, i);
                        return;
                    }
                }
                if (t.streamReader.cancel(new Lt(e.message)).catch(()=>{}), t.streamReader = null, !this._transport.destroyed) {
                    for (const [i, n] of this._intentStates)if (n === t) {
                        this._intentStates.delete(i);
                        break;
                    }
                    this.cleanup();
                }
            }
        }
        get stats() {
            return this._stats;
        }
    }
    class Dn {
        #t = new Map;
        #e = Promise.resolve();
        postMessage(t, e) {
            const s = {
                data: structuredClone(t, e ? {
                    transfer: e
                } : null)
            };
            this.#e.then(()=>{
                for (const [i] of this.#t)i.call(this, s);
            });
        }
        addEventListener(t, e, s = null) {
            let i = null;
            if (s?.signal instanceof AbortSignal) {
                const { signal: n } = s;
                if (n.aborted) {
                    N("LoopbackPort - cannot use an `aborted` signal.");
                    return;
                }
                const r = ()=>this.removeEventListener(t, e);
                i = ()=>n.removeEventListener("abort", r), n.addEventListener("abort", r);
            }
            this.#t.set(e, i);
        }
        removeEventListener(t, e) {
            this.#t.get(e)?.(), this.#t.delete(e);
        }
        terminate() {
            for (const [, t] of this.#t)t?.();
            this.#t.clear();
        }
    }
    class nt {
        static #t = 0;
        static #e = !1;
        static #s;
        static{
            lt && (this.#e = !0, te.workerSrc ||= "./pdf.worker.mjs"), this._isSameOrigin = (t, e)=>{
                let s;
                try {
                    if (s = new URL(t), !s.origin || s.origin === "null") return !1;
                } catch  {
                    return !1;
                }
                const i = new URL(e, s);
                return s.origin === i.origin;
            }, this._createCDNWrapper = (t)=>{
                const e = `await import("${t}");`;
                return URL.createObjectURL(new Blob([
                    e
                ], {
                    type: "text/javascript"
                }));
            };
        }
        constructor({ name: t = null, port: e = null, verbosity: s = pi() } = {}){
            if (this.name = t, this.destroyed = !1, this.verbosity = s, this._readyCapability = Promise.withResolvers(), this._port = null, this._webWorker = null, this._messageHandler = null, e) {
                if (nt.#s?.has(e)) throw new Error("Cannot use more than one PDFWorker per port.");
                (nt.#s ||= new WeakMap).set(e, this), this._initializeFromPort(e);
                return;
            }
            this._initialize();
        }
        get promise() {
            return this._readyCapability.promise;
        }
        #i() {
            this._readyCapability.resolve(), this._messageHandler.send("configure", {
                verbosity: this.verbosity
            });
        }
        get port() {
            return this._port;
        }
        get messageHandler() {
            return this._messageHandler;
        }
        _initializeFromPort(t) {
            this._port = t, this._messageHandler = new Qt("main", "worker", t), this._messageHandler.on("ready", function() {}), this.#i();
        }
        _initialize() {
            if (nt.#e || nt.#r) {
                this._setupFakeWorker();
                return;
            }
            let { workerSrc: t } = nt;
            try {
                nt._isSameOrigin(window.location.href, t) || (t = nt._createCDNWrapper(new URL(t, window.location).href));
                const e = new Worker(t, {
                    type: "module"
                }), s = new Qt("main", "worker", e), i = ()=>{
                    n.abort(), s.destroy(), e.terminate(), this.destroyed ? this._readyCapability.reject(new Error("Worker was destroyed")) : this._setupFakeWorker();
                }, n = new AbortController;
                e.addEventListener("error", ()=>{
                    this._webWorker || i();
                }, {
                    signal: n.signal
                }), s.on("test", (a)=>{
                    if (n.abort(), this.destroyed || !a) {
                        i();
                        return;
                    }
                    this._messageHandler = s, this._port = e, this._webWorker = e, this.#i();
                }), s.on("ready", (a)=>{
                    if (n.abort(), this.destroyed) {
                        i();
                        return;
                    }
                    try {
                        r();
                    } catch  {
                        this._setupFakeWorker();
                    }
                });
                const r = ()=>{
                    const a = new Uint8Array;
                    s.send("test", a, [
                        a.buffer
                    ]);
                };
                r();
                return;
            } catch  {
                be("The worker has been disabled.");
            }
            this._setupFakeWorker();
        }
        _setupFakeWorker() {
            nt.#e || (N("Setting up fake worker."), nt.#e = !0), nt._setupFakeWorkerGlobal.then((t)=>{
                if (this.destroyed) {
                    this._readyCapability.reject(new Error("Worker was destroyed"));
                    return;
                }
                const e = new Dn;
                this._port = e;
                const s = `fake${nt.#t++}`, i = new Qt(s + "_worker", s, e);
                t.setup(i, e), this._messageHandler = new Qt(s, s + "_worker", e), this.#i();
            }).catch((t)=>{
                this._readyCapability.reject(new Error(`Setting up fake worker failed: "${t.message}".`));
            });
        }
        destroy() {
            this.destroyed = !0, this._webWorker?.terminate(), this._webWorker = null, nt.#s?.delete(this._port), this._port = null, this._messageHandler?.destroy(), this._messageHandler = null;
        }
        static fromPort(t) {
            if (!t?.port) throw new Error("PDFWorker.fromPort - invalid method signature.");
            const e = this.#s?.get(t.port);
            if (e) {
                if (e._pendingDestroy) throw new Error("PDFWorker.fromPort - the worker is being destroyed.\nPlease remember to await `PDFDocumentLoadingTask.destroy()`-calls.");
                return e;
            }
            return new nt(t);
        }
        static get workerSrc() {
            if (te.workerSrc) return te.workerSrc;
            throw new Error('No "GlobalWorkerOptions.workerSrc" specified.');
        }
        static get #r() {
            try {
                return globalThis.pdfjsWorker?.WorkerMessageHandler || null;
            } catch  {
                return null;
            }
        }
        static get _setupFakeWorkerGlobal() {
            return O(this, "_setupFakeWorkerGlobal", (async ()=>this.#r ? this.#r : (await import(this.workerSrc).then(async (m)=>{
                    await m.__tla;
                    return m;
                })).WorkerMessageHandler)());
        }
    }
    class Fn {
        #t = new Map;
        #e = new Map;
        #s = new Map;
        #i = new Map;
        #r = null;
        constructor(t, e, s, i, n){
            this.messageHandler = t, this.loadingTask = e, this.commonObjs = new Us, this.fontLoader = new Li({
                ownerDocument: i.ownerDocument,
                styleElement: i.styleElement
            }), this.loadingParams = i.loadingParams, this._params = i, this.canvasFactory = n.canvasFactory, this.filterFactory = n.filterFactory, this.cMapReaderFactory = n.cMapReaderFactory, this.standardFontDataFactory = n.standardFontDataFactory, this.destroyed = !1, this.destroyCapability = null, this._networkStream = s, this._fullReader = null, this._lastProgress = null, this.downloadInfoCapability = Promise.withResolvers(), this.setupMessageHandler();
        }
        #n(t, e = null) {
            const s = this.#t.get(t);
            if (s) return s;
            const i = this.messageHandler.sendWithPromise(t, e);
            return this.#t.set(t, i), i;
        }
        get annotationStorage() {
            return O(this, "annotationStorage", new qe);
        }
        getRenderingIntent(t, e = kt.ENABLE, s = null, i = !1, n = !1) {
            let r = gt.DISPLAY, a = Ne;
            switch(t){
                case "any":
                    r = gt.ANY;
                    break;
                case "display":
                    break;
                case "print":
                    r = gt.PRINT;
                    break;
                default:
                    N(`getRenderingIntent - invalid intent: ${t}`);
            }
            const o = r & gt.PRINT && s instanceof Rs ? s : this.annotationStorage;
            switch(e){
                case kt.DISABLE:
                    r += gt.ANNOTATIONS_DISABLE;
                    break;
                case kt.ENABLE:
                    break;
                case kt.ENABLE_FORMS:
                    r += gt.ANNOTATIONS_FORMS;
                    break;
                case kt.ENABLE_STORAGE:
                    r += gt.ANNOTATIONS_STORAGE, a = o.serializable;
                    break;
                default:
                    N(`getRenderingIntent - invalid annotationMode: ${e}`);
            }
            i && (r += gt.IS_EDITING), n && (r += gt.OPLIST);
            const { ids: l, hash: h } = o.modifiedIds, d = [
                r,
                a.hash,
                h
            ];
            return {
                renderingIntent: r,
                cacheKey: d.join("_"),
                annotationStorageSerializable: a,
                modifiedIds: l
            };
        }
        destroy() {
            if (this.destroyCapability) return this.destroyCapability.promise;
            this.destroyed = !0, this.destroyCapability = Promise.withResolvers(), this.#r?.reject(new Error("Worker was destroyed during onPassword callback"));
            const t = [];
            for (const s of this.#e.values())t.push(s._destroy());
            this.#e.clear(), this.#s.clear(), this.#i.clear(), this.hasOwnProperty("annotationStorage") && this.annotationStorage.resetModified();
            const e = this.messageHandler.sendWithPromise("Terminate", null);
            return t.push(e), Promise.all(t).then(()=>{
                this.commonObjs.clear(), this.fontLoader.clear(), this.#t.clear(), this.filterFactory.destroy(), ct.cleanup(), this._networkStream?.cancelAllRequests(new Lt("Worker was terminated.")), this.messageHandler?.destroy(), this.messageHandler = null, this.destroyCapability.resolve();
            }, this.destroyCapability.reject), this.destroyCapability.promise;
        }
        setupMessageHandler() {
            const { messageHandler: t, loadingTask: e } = this;
            t.on("GetReader", (s, i)=>{
                tt(this._networkStream, "GetReader - no `IPDFStream` instance available."), this._fullReader = this._networkStream.getFullReader(), this._fullReader.onProgress = (n)=>{
                    this._lastProgress = {
                        loaded: n.loaded,
                        total: n.total
                    };
                }, i.onPull = ()=>{
                    this._fullReader.read().then(function({ value: n, done: r }) {
                        if (r) {
                            i.close();
                            return;
                        }
                        tt(n instanceof ArrayBuffer, "GetReader - expected an ArrayBuffer."), i.enqueue(new Uint8Array(n), 1, [
                            n
                        ]);
                    }).catch((n)=>{
                        i.error(n);
                    });
                }, i.onCancel = (n)=>{
                    this._fullReader.cancel(n), i.ready.catch((r)=>{
                        if (!this.destroyed) throw r;
                    });
                };
            }), t.on("ReaderHeadersReady", async (s)=>{
                await this._fullReader.headersReady;
                const { isStreamingSupported: i, isRangeSupported: n, contentLength: r } = this._fullReader;
                return (!i || !n) && (this._lastProgress && e.onProgress?.(this._lastProgress), this._fullReader.onProgress = (a)=>{
                    e.onProgress?.({
                        loaded: a.loaded,
                        total: a.total
                    });
                }), {
                    isStreamingSupported: i,
                    isRangeSupported: n,
                    contentLength: r
                };
            }), t.on("GetRangeReader", (s, i)=>{
                tt(this._networkStream, "GetRangeReader - no `IPDFStream` instance available.");
                const n = this._networkStream.getRangeReader(s.begin, s.end);
                if (!n) {
                    i.close();
                    return;
                }
                i.onPull = ()=>{
                    n.read().then(function({ value: r, done: a }) {
                        if (a) {
                            i.close();
                            return;
                        }
                        tt(r instanceof ArrayBuffer, "GetRangeReader - expected an ArrayBuffer."), i.enqueue(new Uint8Array(r), 1, [
                            r
                        ]);
                    }).catch((r)=>{
                        i.error(r);
                    });
                }, i.onCancel = (r)=>{
                    n.cancel(r), i.ready.catch((a)=>{
                        if (!this.destroyed) throw a;
                    });
                };
            }), t.on("GetDoc", ({ pdfInfo: s })=>{
                this._numPages = s.numPages, this._htmlForXfa = s.htmlForXfa, delete s.htmlForXfa, e._capability.resolve(new In(s, this));
            }), t.on("DocException", (s)=>{
                e._capability.reject(ft(s));
            }), t.on("PasswordRequest", (s)=>{
                this.#r = Promise.withResolvers();
                try {
                    if (!e.onPassword) throw ft(s);
                    const i = (n)=>{
                        n instanceof Error ? this.#r.reject(n) : this.#r.resolve({
                            password: n
                        });
                    };
                    e.onPassword(i, s.code);
                } catch (i) {
                    this.#r.reject(i);
                }
                return this.#r.promise;
            }), t.on("DataLoaded", (s)=>{
                e.onProgress?.({
                    loaded: s.length,
                    total: s.length
                }), this.downloadInfoCapability.resolve(s);
            }), t.on("StartRenderPage", (s)=>{
                if (this.destroyed) return;
                this.#e.get(s.pageIndex)._startRenderPage(s.transparency, s.cacheKey);
            }), t.on("commonobj", ([s, i, n])=>{
                if (this.destroyed || this.commonObjs.has(s)) return null;
                switch(i){
                    case "Font":
                        const { disableFontFace: r, fontExtraProperties: a, pdfBug: o } = this._params;
                        if ("error" in n) {
                            const u = n.error;
                            N(`Error during font loading: ${u}`), this.commonObjs.resolve(s, u);
                            break;
                        }
                        const l = o && globalThis.FontInspector?.enabled ? (u, f)=>globalThis.FontInspector.fontAdded(u, f) : null, h = new Di(n, {
                            disableFontFace: r,
                            fontExtraProperties: a,
                            inspectFont: l
                        });
                        this.fontLoader.bind(h).catch(()=>t.sendWithPromise("FontFallback", {
                                id: s
                            })).finally(()=>{
                            !a && h.data && (h.data = null), this.commonObjs.resolve(s, h);
                        });
                        break;
                    case "CopyLocalImage":
                        const { imageRef: d } = n;
                        tt(d, "The imageRef must be defined.");
                        for (const u of this.#e.values())for (const [, f] of u.objs)if (f?.ref === d) return f.dataLen ? (this.commonObjs.resolve(s, structuredClone(f)), f.dataLen) : null;
                        break;
                    case "FontPath":
                    case "Image":
                    case "Pattern":
                        this.commonObjs.resolve(s, n);
                        break;
                    default:
                        throw new Error(`Got unknown common object type ${i}`);
                }
                return null;
            }), t.on("obj", ([s, i, n, r])=>{
                if (this.destroyed) return;
                const a = this.#e.get(i);
                if (!a.objs.has(s)) {
                    if (a._intentStates.size === 0) {
                        r?.bitmap?.close();
                        return;
                    }
                    switch(n){
                        case "Image":
                            a.objs.resolve(s, r), r?.dataLen > hi && (a._maybeCleanupAfterRender = !0);
                            break;
                        case "Pattern":
                            a.objs.resolve(s, r);
                            break;
                        default:
                            throw new Error(`Got unknown object type ${n}`);
                    }
                }
            }), t.on("DocProgress", (s)=>{
                this.destroyed || e.onProgress?.({
                    loaded: s.loaded,
                    total: s.total
                });
            }), t.on("FetchBuiltInCMap", async (s)=>{
                if (this.destroyed) throw new Error("Worker was destroyed.");
                if (!this.cMapReaderFactory) throw new Error("CMapReaderFactory not initialized, see the `useWorkerFetch` parameter.");
                return this.cMapReaderFactory.fetch(s);
            }), t.on("FetchStandardFontData", async (s)=>{
                if (this.destroyed) throw new Error("Worker was destroyed.");
                if (!this.standardFontDataFactory) throw new Error("StandardFontDataFactory not initialized, see the `useWorkerFetch` parameter.");
                return this.standardFontDataFactory.fetch(s);
            });
        }
        getData() {
            return this.messageHandler.sendWithPromise("GetData", null);
        }
        saveDocument() {
            this.annotationStorage.size <= 0 && N("saveDocument called while `annotationStorage` is empty, please use the getData-method instead.");
            const { map: t, transfer: e } = this.annotationStorage.serializable;
            return this.messageHandler.sendWithPromise("SaveDocument", {
                isPureXfa: !!this._htmlForXfa,
                numPages: this._numPages,
                annotationStorage: t,
                filename: this._fullReader?.filename ?? null
            }, e).finally(()=>{
                this.annotationStorage.resetModified();
            });
        }
        getPage(t) {
            if (!Number.isInteger(t) || t <= 0 || t > this._numPages) return Promise.reject(new Error("Invalid page request."));
            const e = t - 1, s = this.#s.get(e);
            if (s) return s;
            const i = this.messageHandler.sendWithPromise("GetPage", {
                pageIndex: e
            }).then((n)=>{
                if (this.destroyed) throw new Error("Transport destroyed");
                n.refStr && this.#i.set(n.refStr, t);
                const r = new Ln(e, n, this, this._params.pdfBug);
                return this.#e.set(e, r), r;
            });
            return this.#s.set(e, i), i;
        }
        getPageIndex(t) {
            return _s(t) ? this.messageHandler.sendWithPromise("GetPageIndex", {
                num: t.num,
                gen: t.gen
            }) : Promise.reject(new Error("Invalid pageIndex request."));
        }
        getAnnotations(t, e) {
            return this.messageHandler.sendWithPromise("GetAnnotations", {
                pageIndex: t,
                intent: e
            });
        }
        getFieldObjects() {
            return this.#n("GetFieldObjects");
        }
        hasJSActions() {
            return this.#n("HasJSActions");
        }
        getCalculationOrderIds() {
            return this.messageHandler.sendWithPromise("GetCalculationOrderIds", null);
        }
        getDestinations() {
            return this.messageHandler.sendWithPromise("GetDestinations", null);
        }
        getDestination(t) {
            return typeof t != "string" ? Promise.reject(new Error("Invalid destination request.")) : this.messageHandler.sendWithPromise("GetDestination", {
                id: t
            });
        }
        getPageLabels() {
            return this.messageHandler.sendWithPromise("GetPageLabels", null);
        }
        getPageLayout() {
            return this.messageHandler.sendWithPromise("GetPageLayout", null);
        }
        getPageMode() {
            return this.messageHandler.sendWithPromise("GetPageMode", null);
        }
        getViewerPreferences() {
            return this.messageHandler.sendWithPromise("GetViewerPreferences", null);
        }
        getOpenAction() {
            return this.messageHandler.sendWithPromise("GetOpenAction", null);
        }
        getAttachments() {
            return this.messageHandler.sendWithPromise("GetAttachments", null);
        }
        getDocJSActions() {
            return this.#n("GetDocJSActions");
        }
        getPageJSActions(t) {
            return this.messageHandler.sendWithPromise("GetPageJSActions", {
                pageIndex: t
            });
        }
        getStructTree(t) {
            return this.messageHandler.sendWithPromise("GetStructTree", {
                pageIndex: t
            });
        }
        getOutline() {
            return this.messageHandler.sendWithPromise("GetOutline", null);
        }
        getOptionalContentConfig(t) {
            return this.#n("GetOptionalContentConfig").then((e)=>new sn(e, t));
        }
        getPermissions() {
            return this.messageHandler.sendWithPromise("GetPermissions", null);
        }
        getMetadata() {
            const t = "GetMetadata", e = this.#t.get(t);
            if (e) return e;
            const s = this.messageHandler.sendWithPromise(t, null).then((i)=>({
                    info: i[0],
                    metadata: i[1] ? new tn(i[1]) : null,
                    contentDispositionFilename: this._fullReader?.filename ?? null,
                    contentLength: this._fullReader?.contentLength ?? null
                }));
            return this.#t.set(t, s), s;
        }
        getMarkInfo() {
            return this.messageHandler.sendWithPromise("GetMarkInfo", null);
        }
        async startCleanup(t = !1) {
            if (!this.destroyed) {
                await this.messageHandler.sendWithPromise("Cleanup", null);
                for (const e of this.#e.values())if (!e.cleanup()) throw new Error(`startCleanup: Page ${e.pageNumber} is currently rendering.`);
                this.commonObjs.clear(), t || this.fontLoader.clear(), this.#t.clear(), this.filterFactory.destroy(!0), ct.cleanup();
            }
        }
        cachedPageNumber(t) {
            if (!_s(t)) return null;
            const e = t.gen === 0 ? `${t.num}R` : `${t.num}R${t.gen}`;
            return this.#i.get(e) ?? null;
        }
    }
    const qt = Symbol("INITIAL_DATA");
    class Us {
        #t = Object.create(null);
        #e(t) {
            return this.#t[t] ||= {
                ...Promise.withResolvers(),
                data: qt
            };
        }
        get(t, e = null) {
            if (e) {
                const i = this.#e(t);
                return i.promise.then(()=>e(i.data)), null;
            }
            const s = this.#t[t];
            if (!s || s.data === qt) throw new Error(`Requesting object that isn't resolved yet ${t}.`);
            return s.data;
        }
        has(t) {
            const e = this.#t[t];
            return !!e && e.data !== qt;
        }
        delete(t) {
            const e = this.#t[t];
            return !e || e.data === qt ? !1 : (delete this.#t[t], !0);
        }
        resolve(t, e = null) {
            const s = this.#e(t);
            s.data = e, s.resolve();
        }
        clear() {
            for(const t in this.#t){
                const { data: e } = this.#t[t];
                e?.bitmap?.close();
            }
            this.#t = Object.create(null);
        }
        *[Symbol.iterator]() {
            for(const t in this.#t){
                const { data: e } = this.#t[t];
                e !== qt && (yield [
                    t,
                    e
                ]);
            }
        }
    }
    class Nn {
        #t = null;
        constructor(t){
            this.#t = t, this.onContinue = null;
        }
        get promise() {
            return this.#t.capability.promise;
        }
        cancel(t = 0) {
            this.#t.cancel(null, t);
        }
        get separateAnnots() {
            const { separateAnnots: t } = this.#t.operatorList;
            if (!t) return !1;
            const { annotationCanvasMap: e } = this.#t;
            return t.form || t.canvas && e?.size > 0;
        }
    }
    class jt {
        #t = null;
        static #e = new WeakSet;
        constructor({ callback: t, params: e, objs: s, commonObjs: i, annotationCanvasMap: n, operatorList: r, pageIndex: a, canvasFactory: o, filterFactory: l, useRequestAnimationFrame: h = !1, pdfBug: d = !1, pageColors: u = null }){
            this.callback = t, this.params = e, this.objs = s, this.commonObjs = i, this.annotationCanvasMap = n, this.operatorListIdx = null, this.operatorList = r, this._pageIndex = a, this.canvasFactory = o, this.filterFactory = l, this._pdfBug = d, this.pageColors = u, this.running = !1, this.graphicsReadyCallback = null, this.graphicsReady = !1, this._useRequestAnimationFrame = h === !0 && typeof window < "u", this.cancelled = !1, this.capability = Promise.withResolvers(), this.task = new Nn(this), this._cancelBound = this.cancel.bind(this), this._continueBound = this._continue.bind(this), this._scheduleNextBound = this._scheduleNext.bind(this), this._nextBound = this._next.bind(this), this._canvas = e.canvasContext.canvas;
        }
        get completed() {
            return this.capability.promise.catch(function() {});
        }
        initializeGraphics({ transparency: t = !1, optionalContentConfig: e }) {
            if (this.cancelled) return;
            if (this._canvas) {
                if (jt.#e.has(this._canvas)) throw new Error("Cannot use the same canvas during multiple render() operations. Use different canvas or ensure previous operations were cancelled or completed.");
                jt.#e.add(this._canvas);
            }
            this._pdfBug && globalThis.StepperManager?.enabled && (this.stepper = globalThis.StepperManager.create(this._pageIndex), this.stepper.init(this.operatorList), this.stepper.nextBreakPoint = this.stepper.getNextBreakPoint());
            const { canvasContext: s, viewport: i, transform: n, background: r } = this.params;
            this.gfx = new Ut(s, this.commonObjs, this.objs, this.canvasFactory, this.filterFactory, {
                optionalContentConfig: e
            }, this.annotationCanvasMap, this.pageColors), this.gfx.beginDrawing({
                transform: n,
                viewport: i,
                transparency: t,
                background: r
            }), this.operatorListIdx = 0, this.graphicsReady = !0, this.graphicsReadyCallback?.();
        }
        cancel(t = null, e = 0) {
            this.running = !1, this.cancelled = !0, this.gfx?.endDrawing(), this.#t && (window.cancelAnimationFrame(this.#t), this.#t = null), jt.#e.delete(this._canvas), this.callback(t || new je(`Rendering cancelled, page ${this._pageIndex + 1}`, e));
        }
        operatorListChanged() {
            if (!this.graphicsReady) {
                this.graphicsReadyCallback ||= this._continueBound;
                return;
            }
            this.stepper?.updateOperatorList(this.operatorList), !this.running && this._continue();
        }
        _continue() {
            this.running = !0, !this.cancelled && (this.task.onContinue ? this.task.onContinue(this._scheduleNextBound) : this._scheduleNext());
        }
        _scheduleNext() {
            this._useRequestAnimationFrame ? this.#t = window.requestAnimationFrame(()=>{
                this.#t = null, this._nextBound().catch(this._cancelBound);
            }) : Promise.resolve().then(this._nextBound).catch(this._cancelBound);
        }
        async _next() {
            this.cancelled || (this.operatorListIdx = this.gfx.executeOperatorList(this.operatorList, this.operatorListIdx, this._continueBound, this.stepper), this.operatorListIdx === this.operatorList.argsArray.length && (this.running = !1, this.operatorList.lastChunk && (this.gfx.endDrawing(), jt.#e.delete(this._canvas), this.callback())));
        }
    }
    const On = "4.10.38", Bn = "f9bea397f";
    function Ss(c) {
        return Math.floor(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0");
    }
    function Yt(c) {
        return Math.max(0, Math.min(255, 255 * c));
    }
    class Es {
        static CMYK_G([t, e, s, i]) {
            return [
                "G",
                1 - Math.min(1, .3 * t + .59 * s + .11 * e + i)
            ];
        }
        static G_CMYK([t]) {
            return [
                "CMYK",
                0,
                0,
                0,
                1 - t
            ];
        }
        static G_RGB([t]) {
            return [
                "RGB",
                t,
                t,
                t
            ];
        }
        static G_rgb([t]) {
            return t = Yt(t), [
                t,
                t,
                t
            ];
        }
        static G_HTML([t]) {
            const e = Ss(t);
            return `#${e}${e}${e}`;
        }
        static RGB_G([t, e, s]) {
            return [
                "G",
                .3 * t + .59 * e + .11 * s
            ];
        }
        static RGB_rgb(t) {
            return t.map(Yt);
        }
        static RGB_HTML(t) {
            return `#${t.map(Ss).join("")}`;
        }
        static T_HTML() {
            return "#00000000";
        }
        static T_rgb() {
            return [
                null
            ];
        }
        static CMYK_RGB([t, e, s, i]) {
            return [
                "RGB",
                1 - Math.min(1, t + i),
                1 - Math.min(1, s + i),
                1 - Math.min(1, e + i)
            ];
        }
        static CMYK_rgb([t, e, s, i]) {
            return [
                Yt(1 - Math.min(1, t + i)),
                Yt(1 - Math.min(1, s + i)),
                Yt(1 - Math.min(1, e + i))
            ];
        }
        static CMYK_HTML(t) {
            const e = this.CMYK_RGB(t).slice(1);
            return this.RGB_HTML(e);
        }
        static RGB_CMYK([t, e, s]) {
            const i = 1 - t, n = 1 - e, r = 1 - s, a = Math.min(i, n, r);
            return [
                "CMYK",
                i,
                n,
                r,
                a
            ];
        }
    }
    class Hn {
        create(t, e, s = !1) {
            if (t <= 0 || e <= 0) throw new Error("Invalid SVG dimensions");
            const i = this._createSVG("svg:svg");
            return i.setAttribute("version", "1.1"), s || (i.setAttribute("width", `${t}px`), i.setAttribute("height", `${e}px`)), i.setAttribute("preserveAspectRatio", "none"), i.setAttribute("viewBox", `0 0 ${t} ${e}`), i;
        }
        createElement(t) {
            if (typeof t != "string") throw new Error("Invalid SVG element type");
            return this._createSVG(t);
        }
        _createSVG(t) {
            V("Abstract method `_createSVG` called.");
        }
    }
    class Je extends Hn {
        _createSVG(t) {
            return document.createElementNS(Pt, t);
        }
    }
    class Vs {
        static setupStorage(t, e, s, i, n) {
            const r = i.getValue(e, {
                value: null
            });
            switch(s.name){
                case "textarea":
                    if (r.value !== null && (t.textContent = r.value), n === "print") break;
                    t.addEventListener("input", (a)=>{
                        i.setValue(e, {
                            value: a.target.value
                        });
                    });
                    break;
                case "input":
                    if (s.attributes.type === "radio" || s.attributes.type === "checkbox") {
                        if (r.value === s.attributes.xfaOn ? t.setAttribute("checked", !0) : r.value === s.attributes.xfaOff && t.removeAttribute("checked"), n === "print") break;
                        t.addEventListener("change", (a)=>{
                            i.setValue(e, {
                                value: a.target.checked ? a.target.getAttribute("xfaOn") : a.target.getAttribute("xfaOff")
                            });
                        });
                    } else {
                        if (r.value !== null && t.setAttribute("value", r.value), n === "print") break;
                        t.addEventListener("input", (a)=>{
                            i.setValue(e, {
                                value: a.target.value
                            });
                        });
                    }
                    break;
                case "select":
                    if (r.value !== null) {
                        t.setAttribute("value", r.value);
                        for (const a of s.children)a.attributes.value === r.value ? a.attributes.selected = !0 : a.attributes.hasOwnProperty("selected") && delete a.attributes.selected;
                    }
                    t.addEventListener("input", (a)=>{
                        const o = a.target.options, l = o.selectedIndex === -1 ? "" : o[o.selectedIndex].value;
                        i.setValue(e, {
                            value: l
                        });
                    });
                    break;
            }
        }
        static setAttributes({ html: t, element: e, storage: s = null, intent: i, linkService: n }) {
            const { attributes: r } = e, a = t instanceof HTMLAnchorElement;
            r.type === "radio" && (r.name = `${r.name}-${i}`);
            for (const [o, l] of Object.entries(r))if (l != null) switch(o){
                case "class":
                    l.length && t.setAttribute(o, l.join(" "));
                    break;
                case "dataId":
                    break;
                case "id":
                    t.setAttribute("data-element-id", l);
                    break;
                case "style":
                    Object.assign(t.style, l);
                    break;
                case "textContent":
                    t.textContent = l;
                    break;
                default:
                    (!a || o !== "href" && o !== "newWindow") && t.setAttribute(o, l);
            }
            a && n.addLinkAttributes(t, r.href, r.newWindow), s && r.dataId && this.setupStorage(t, r.dataId, e, s);
        }
        static render(t) {
            const e = t.annotationStorage, s = t.linkService, i = t.xfaHtml, n = t.intent || "display", r = document.createElement(i.name);
            i.attributes && this.setAttributes({
                html: r,
                element: i,
                intent: n,
                linkService: s
            });
            const a = n !== "richText", o = t.div;
            if (o.append(r), t.viewport) {
                const d = `matrix(${t.viewport.transform.join(",")})`;
                o.style.transform = d;
            }
            a && o.setAttribute("class", "xfaLayer xfaFont");
            const l = [];
            if (i.children.length === 0) {
                if (i.value) {
                    const d = document.createTextNode(i.value);
                    r.append(d), a && se.shouldBuildText(i.name) && l.push(d);
                }
                return {
                    textDivs: l
                };
            }
            const h = [
                [
                    i,
                    -1,
                    r
                ]
            ];
            for(; h.length > 0;){
                const [d, u, f] = h.at(-1);
                if (u + 1 === d.children.length) {
                    h.pop();
                    continue;
                }
                const p = d.children[++h.at(-1)[1]];
                if (p === null) continue;
                const { name: g } = p;
                if (g === "#text") {
                    const m = document.createTextNode(p.value);
                    l.push(m), f.append(m);
                    continue;
                }
                const b = p?.attributes?.xmlns ? document.createElementNS(p.attributes.xmlns, g) : document.createElement(g);
                if (f.append(b), p.attributes && this.setAttributes({
                    html: b,
                    element: p,
                    storage: e,
                    intent: n,
                    linkService: s
                }), p.children?.length > 0) h.push([
                    p,
                    -1,
                    b
                ]);
                else if (p.value) {
                    const m = document.createTextNode(p.value);
                    a && se.shouldBuildText(g) && l.push(m), b.append(m);
                }
            }
            for (const d of o.querySelectorAll(".xfaNonInteractive input, .xfaNonInteractive textarea"))d.setAttribute("readOnly", !0);
            return {
                textDivs: l
            };
        }
        static update(t) {
            const e = `matrix(${t.viewport.transform.join(",")})`;
            t.div.style.transform = e, t.div.hidden = !1;
        }
    }
    const re = 1e3, $n = 9, $t = new WeakSet;
    function It(c) {
        return {
            width: c[2] - c[0],
            height: c[3] - c[1]
        };
    }
    class zn {
        static create(t) {
            switch(t.data.annotationType){
                case st.LINK:
                    return new Ws(t);
                case st.TEXT:
                    return new Gn(t);
                case st.WIDGET:
                    switch(t.data.fieldType){
                        case "Tx":
                            return new jn(t);
                        case "Btn":
                            return t.data.radioButton ? new Xs(t) : t.data.checkBox ? new Vn(t) : new Wn(t);
                        case "Ch":
                            return new Xn(t);
                        case "Sig":
                            return new Un(t);
                    }
                    return new zt(t);
                case st.POPUP:
                    return new Be(t);
                case st.FREETEXT:
                    return new qs(t);
                case st.LINE:
                    return new Yn(t);
                case st.SQUARE:
                    return new Kn(t);
                case st.CIRCLE:
                    return new Qn(t);
                case st.POLYLINE:
                    return new Ys(t);
                case st.CARET:
                    return new Zn(t);
                case st.INK:
                    return new Ze(t);
                case st.POLYGON:
                    return new Jn(t);
                case st.HIGHLIGHT:
                    return new Ks(t);
                case st.UNDERLINE:
                    return new tr(t);
                case st.SQUIGGLY:
                    return new er(t);
                case st.STRIKEOUT:
                    return new sr(t);
                case st.STAMP:
                    return new Qs(t);
                case st.FILEATTACHMENT:
                    return new ir(t);
                default:
                    return new J(t);
            }
        }
    }
    class J {
        #t = null;
        #e = !1;
        #s = null;
        constructor(t, { isRenderable: e = !1, ignoreBorder: s = !1, createQuadrilaterals: i = !1 } = {}){
            this.isRenderable = e, this.data = t.data, this.layer = t.layer, this.linkService = t.linkService, this.downloadManager = t.downloadManager, this.imageResourcesPath = t.imageResourcesPath, this.renderForms = t.renderForms, this.svgFactory = t.svgFactory, this.annotationStorage = t.annotationStorage, this.enableScripting = t.enableScripting, this.hasJSActions = t.hasJSActions, this._fieldObjects = t.fieldObjects, this.parent = t.parent, e && (this.container = this._createContainer(s)), i && this._createQuadrilaterals();
        }
        static _hasPopupData({ titleObj: t, contentsObj: e, richText: s }) {
            return !!(t?.str || e?.str || s?.str);
        }
        get _isEditable() {
            return this.data.isEditable;
        }
        get hasPopupData() {
            return J._hasPopupData(this.data);
        }
        updateEdited(t) {
            if (!this.container) return;
            this.#t ||= {
                rect: this.data.rect.slice(0)
            };
            const { rect: e } = t;
            e && this.#i(e), this.#s?.popup.updateEdited(t);
        }
        resetEdited() {
            this.#t && (this.#i(this.#t.rect), this.#s?.popup.resetEdited(), this.#t = null);
        }
        #i(t) {
            const { container: { style: e }, data: { rect: s, rotation: i }, parent: { viewport: { rawDims: { pageWidth: n, pageHeight: r, pageX: a, pageY: o } } } } = this;
            s?.splice(0, 4, ...t);
            const { width: l, height: h } = It(t);
            e.left = `${100 * (t[0] - a) / n}%`, e.top = `${100 * (r - t[3] + o) / r}%`, i === 0 ? (e.width = `${100 * l / n}%`, e.height = `${100 * h / r}%`) : this.setRotation(i);
        }
        _createContainer(t) {
            const { data: e, parent: { page: s, viewport: i } } = this, n = document.createElement("section");
            n.setAttribute("data-annotation-id", e.id), this instanceof zt || (n.tabIndex = re);
            const { style: r } = n;
            if (r.zIndex = this.parent.zIndex++, e.alternativeText && (n.title = e.alternativeText), e.noRotate && n.classList.add("norotate"), !e.rect || this instanceof Be) {
                const { rotation: g } = e;
                return !e.hasOwnCanvas && g !== 0 && this.setRotation(g, n), n;
            }
            const { width: a, height: o } = It(e.rect);
            if (!t && e.borderStyle.width > 0) {
                r.borderWidth = `${e.borderStyle.width}px`;
                const g = e.borderStyle.horizontalCornerRadius, b = e.borderStyle.verticalCornerRadius;
                if (g > 0 || b > 0) {
                    const A = `calc(${g}px * var(--scale-factor)) / calc(${b}px * var(--scale-factor))`;
                    r.borderRadius = A;
                } else if (this instanceof Xs) {
                    const A = `calc(${a}px * var(--scale-factor)) / calc(${o}px * var(--scale-factor))`;
                    r.borderRadius = A;
                }
                switch(e.borderStyle.style){
                    case Wt.SOLID:
                        r.borderStyle = "solid";
                        break;
                    case Wt.DASHED:
                        r.borderStyle = "dashed";
                        break;
                    case Wt.BEVELED:
                        N("Unimplemented border style: beveled");
                        break;
                    case Wt.INSET:
                        N("Unimplemented border style: inset");
                        break;
                    case Wt.UNDERLINE:
                        r.borderBottomStyle = "solid";
                        break;
                }
                const m = e.borderColor || null;
                m ? (this.#e = !0, r.borderColor = T.makeHexColor(m[0] | 0, m[1] | 0, m[2] | 0)) : r.borderWidth = 0;
            }
            const l = T.normalizeRect([
                e.rect[0],
                s.view[3] - e.rect[1] + s.view[1],
                e.rect[2],
                s.view[3] - e.rect[3] + s.view[1]
            ]), { pageWidth: h, pageHeight: d, pageX: u, pageY: f } = i.rawDims;
            r.left = `${100 * (l[0] - u) / h}%`, r.top = `${100 * (l[1] - f) / d}%`;
            const { rotation: p } = e;
            return e.hasOwnCanvas || p === 0 ? (r.width = `${100 * a / h}%`, r.height = `${100 * o / d}%`) : this.setRotation(p, n), n;
        }
        setRotation(t, e = this.container) {
            if (!this.data.rect) return;
            const { pageWidth: s, pageHeight: i } = this.parent.viewport.rawDims, { width: n, height: r } = It(this.data.rect);
            let a, o;
            t % 180 === 0 ? (a = 100 * n / s, o = 100 * r / i) : (a = 100 * r / s, o = 100 * n / i), e.style.width = `${a}%`, e.style.height = `${o}%`, e.setAttribute("data-main-rotation", (360 - t) % 360);
        }
        get _commonActions() {
            const t = (e, s, i)=>{
                const n = i.detail[e], r = n[0], a = n.slice(1);
                i.target.style[s] = Es[`${r}_HTML`](a), this.annotationStorage.setValue(this.data.id, {
                    [s]: Es[`${r}_rgb`](a)
                });
            };
            return O(this, "_commonActions", {
                display: (e)=>{
                    const { display: s } = e.detail, i = s % 2 === 1;
                    this.container.style.visibility = i ? "hidden" : "visible", this.annotationStorage.setValue(this.data.id, {
                        noView: i,
                        noPrint: s === 1 || s === 2
                    });
                },
                print: (e)=>{
                    this.annotationStorage.setValue(this.data.id, {
                        noPrint: !e.detail.print
                    });
                },
                hidden: (e)=>{
                    const { hidden: s } = e.detail;
                    this.container.style.visibility = s ? "hidden" : "visible", this.annotationStorage.setValue(this.data.id, {
                        noPrint: s,
                        noView: s
                    });
                },
                focus: (e)=>{
                    setTimeout(()=>e.target.focus({
                            preventScroll: !1
                        }), 0);
                },
                userName: (e)=>{
                    e.target.title = e.detail.userName;
                },
                readonly: (e)=>{
                    e.target.disabled = e.detail.readonly;
                },
                required: (e)=>{
                    this._setRequired(e.target, e.detail.required);
                },
                bgColor: (e)=>{
                    t("bgColor", "backgroundColor", e);
                },
                fillColor: (e)=>{
                    t("fillColor", "backgroundColor", e);
                },
                fgColor: (e)=>{
                    t("fgColor", "color", e);
                },
                textColor: (e)=>{
                    t("textColor", "color", e);
                },
                borderColor: (e)=>{
                    t("borderColor", "borderColor", e);
                },
                strokeColor: (e)=>{
                    t("strokeColor", "borderColor", e);
                },
                rotation: (e)=>{
                    const s = e.detail.rotation;
                    this.setRotation(s), this.annotationStorage.setValue(this.data.id, {
                        rotation: s
                    });
                }
            });
        }
        _dispatchEventFromSandbox(t, e) {
            const s = this._commonActions;
            for (const i of Object.keys(e.detail))(t[i] || s[i])?.(e);
        }
        _setDefaultPropertiesFromJS(t) {
            if (!this.enableScripting) return;
            const e = this.annotationStorage.getRawValue(this.data.id);
            if (!e) return;
            const s = this._commonActions;
            for (const [i, n] of Object.entries(e)){
                const r = s[i];
                if (r) {
                    const a = {
                        detail: {
                            [i]: n
                        },
                        target: t
                    };
                    r(a), delete e[i];
                }
            }
        }
        _createQuadrilaterals() {
            if (!this.container) return;
            const { quadPoints: t } = this.data;
            if (!t) return;
            const [e, s, i, n] = this.data.rect.map((g)=>Math.fround(g));
            if (t.length === 8) {
                const [g, b, m, A] = t.subarray(2, 6);
                if (i === g && n === b && e === m && s === A) return;
            }
            const { style: r } = this.container;
            let a;
            if (this.#e) {
                const { borderColor: g, borderWidth: b } = r;
                r.borderWidth = 0, a = [
                    "url('data:image/svg+xml;utf8,",
                    '<svg xmlns="http://www.w3.org/2000/svg"',
                    ' preserveAspectRatio="none" viewBox="0 0 1 1">',
                    `<g fill="transparent" stroke="${g}" stroke-width="${b}">`
                ], this.container.classList.add("hasBorder");
            }
            const o = i - e, l = n - s, { svgFactory: h } = this, d = h.createElement("svg");
            d.classList.add("quadrilateralsContainer"), d.setAttribute("width", 0), d.setAttribute("height", 0);
            const u = h.createElement("defs");
            d.append(u);
            const f = h.createElement("clipPath"), p = `clippath_${this.data.id}`;
            f.setAttribute("id", p), f.setAttribute("clipPathUnits", "objectBoundingBox"), u.append(f);
            for(let g = 2, b = t.length; g < b; g += 8){
                const m = t[g], A = t[g + 1], y = t[g + 2], v = t[g + 3], w = h.createElement("rect"), S = (y - e) / o, _ = (n - A) / l, R = (m - y) / o, M = (A - v) / l;
                w.setAttribute("x", S), w.setAttribute("y", _), w.setAttribute("width", R), w.setAttribute("height", M), f.append(w), a?.push(`<rect vector-effect="non-scaling-stroke" x="${S}" y="${_}" width="${R}" height="${M}"/>`);
            }
            this.#e && (a.push("</g></svg>')"), r.backgroundImage = a.join("")), this.container.append(d), this.container.style.clipPath = `url(#${p})`;
        }
        _createPopup() {
            const { data: t } = this, e = this.#s = new Be({
                data: {
                    color: t.color,
                    titleObj: t.titleObj,
                    modificationDate: t.modificationDate,
                    contentsObj: t.contentsObj,
                    richText: t.richText,
                    parentRect: t.rect,
                    borderStyle: 0,
                    id: `popup_${t.id}`,
                    rotation: t.rotation
                },
                parent: this.parent,
                elements: [
                    this
                ]
            });
            this.parent.div.append(e.render());
        }
        render() {
            V("Abstract method `AnnotationElement.render` called");
        }
        _getElementsByName(t, e = null) {
            const s = [];
            if (this._fieldObjects) {
                const i = this._fieldObjects[t];
                if (i) for (const { page: n, id: r, exportValues: a } of i){
                    if (n === -1 || r === e) continue;
                    const o = typeof a == "string" ? a : null, l = document.querySelector(`[data-element-id="${r}"]`);
                    if (l && !$t.has(l)) {
                        N(`_getElementsByName - element not allowed: ${r}`);
                        continue;
                    }
                    s.push({
                        id: r,
                        exportValue: o,
                        domElement: l
                    });
                }
                return s;
            }
            for (const i of document.getElementsByName(t)){
                const { exportValue: n } = i, r = i.getAttribute("data-element-id");
                r !== e && $t.has(i) && s.push({
                    id: r,
                    exportValue: n,
                    domElement: i
                });
            }
            return s;
        }
        show() {
            this.container && (this.container.hidden = !1), this.popup?.maybeShow();
        }
        hide() {
            this.container && (this.container.hidden = !0), this.popup?.forceHide();
        }
        getElementsToTriggerPopup() {
            return this.container;
        }
        addHighlightArea() {
            const t = this.getElementsToTriggerPopup();
            if (Array.isArray(t)) for (const e of t)e.classList.add("highlightArea");
            else t.classList.add("highlightArea");
        }
        _editOnDoubleClick() {
            if (!this._isEditable) return;
            const { annotationEditorType: t, data: { id: e } } = this;
            this.container.addEventListener("dblclick", ()=>{
                this.linkService.eventBus?.dispatch("switchannotationeditormode", {
                    source: this,
                    mode: t,
                    editId: e
                });
            });
        }
    }
    class Ws extends J {
        constructor(t, e = null){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !!e?.ignoreBorder,
                createQuadrilaterals: !0
            }), this.isTooltipOnly = t.data.isTooltipOnly;
        }
        render() {
            const { data: t, linkService: e } = this, s = document.createElement("a");
            s.setAttribute("data-element-id", t.id);
            let i = !1;
            return t.url ? (e.addLinkAttributes(s, t.url, t.newWindow), i = !0) : t.action ? (this._bindNamedAction(s, t.action), i = !0) : t.attachment ? (this.#e(s, t.attachment, t.attachmentDest), i = !0) : t.setOCGState ? (this.#s(s, t.setOCGState), i = !0) : t.dest ? (this._bindLink(s, t.dest), i = !0) : (t.actions && (t.actions.Action || t.actions["Mouse Up"] || t.actions["Mouse Down"]) && this.enableScripting && this.hasJSActions && (this._bindJSAction(s, t), i = !0), t.resetForm ? (this._bindResetFormAction(s, t.resetForm), i = !0) : this.isTooltipOnly && !i && (this._bindLink(s, ""), i = !0)), this.container.classList.add("linkAnnotation"), i && this.container.append(s), this.container;
        }
        #t() {
            this.container.setAttribute("data-internal-link", "");
        }
        _bindLink(t, e) {
            t.href = this.linkService.getDestinationHash(e), t.onclick = ()=>(e && this.linkService.goToDestination(e), !1), (e || e === "") && this.#t();
        }
        _bindNamedAction(t, e) {
            t.href = this.linkService.getAnchorUrl(""), t.onclick = ()=>(this.linkService.executeNamedAction(e), !1), this.#t();
        }
        #e(t, e, s = null) {
            t.href = this.linkService.getAnchorUrl(""), e.description && (t.title = e.description), t.onclick = ()=>(this.downloadManager?.openOrDownloadData(e.content, e.filename, s), !1), this.#t();
        }
        #s(t, e) {
            t.href = this.linkService.getAnchorUrl(""), t.onclick = ()=>(this.linkService.executeSetOCGState(e), !1), this.#t();
        }
        _bindJSAction(t, e) {
            t.href = this.linkService.getAnchorUrl("");
            const s = new Map([
                [
                    "Action",
                    "onclick"
                ],
                [
                    "Mouse Up",
                    "onmouseup"
                ],
                [
                    "Mouse Down",
                    "onmousedown"
                ]
            ]);
            for (const i of Object.keys(e.actions)){
                const n = s.get(i);
                n && (t[n] = ()=>(this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                        source: this,
                        detail: {
                            id: e.id,
                            name: i
                        }
                    }), !1));
            }
            t.onclick || (t.onclick = ()=>!1), this.#t();
        }
        _bindResetFormAction(t, e) {
            const s = t.onclick;
            if (s || (t.href = this.linkService.getAnchorUrl("")), this.#t(), !this._fieldObjects) {
                N('_bindResetFormAction - "resetForm" action not supported, ensure that the `fieldObjects` parameter is provided.'), s || (t.onclick = ()=>!1);
                return;
            }
            t.onclick = ()=>{
                s?.();
                const { fields: i, refs: n, include: r } = e, a = [];
                if (i.length !== 0 || n.length !== 0) {
                    const h = new Set(n);
                    for (const d of i){
                        const u = this._fieldObjects[d] || [];
                        for (const { id: f } of u)h.add(f);
                    }
                    for (const d of Object.values(this._fieldObjects))for (const u of d)h.has(u.id) === r && a.push(u);
                } else for (const h of Object.values(this._fieldObjects))a.push(...h);
                const o = this.annotationStorage, l = [];
                for (const h of a){
                    const { id: d } = h;
                    switch(l.push(d), h.type){
                        case "text":
                            {
                                const f = h.defaultValue || "";
                                o.setValue(d, {
                                    value: f
                                });
                                break;
                            }
                        case "checkbox":
                        case "radiobutton":
                            {
                                const f = h.defaultValue === h.exportValues;
                                o.setValue(d, {
                                    value: f
                                });
                                break;
                            }
                        case "combobox":
                        case "listbox":
                            {
                                const f = h.defaultValue || "";
                                o.setValue(d, {
                                    value: f
                                });
                                break;
                            }
                        default:
                            continue;
                    }
                    const u = document.querySelector(`[data-element-id="${d}"]`);
                    if (u) {
                        if (!$t.has(u)) {
                            N(`_bindResetFormAction - element not allowed: ${d}`);
                            continue;
                        }
                    } else continue;
                    u.dispatchEvent(new Event("resetform"));
                }
                return this.enableScripting && this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                    source: this,
                    detail: {
                        id: "app",
                        ids: l,
                        name: "ResetForm"
                    }
                }), !1;
            };
        }
    }
    class Gn extends J {
        constructor(t){
            super(t, {
                isRenderable: !0
            });
        }
        render() {
            this.container.classList.add("textAnnotation");
            const t = document.createElement("img");
            return t.src = this.imageResourcesPath + "annotation-" + this.data.name.toLowerCase() + ".svg", t.setAttribute("data-l10n-id", "pdfjs-text-annotation-type"), t.setAttribute("data-l10n-args", JSON.stringify({
                type: this.data.name
            })), !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.append(t), this.container;
        }
    }
    class zt extends J {
        render() {
            return this.container;
        }
        showElementAndHideCanvas(t) {
            this.data.hasOwnCanvas && (t.previousSibling?.nodeName === "CANVAS" && (t.previousSibling.hidden = !0), t.hidden = !1);
        }
        _getKeyModifier(t) {
            return dt.platform.isMac ? t.metaKey : t.ctrlKey;
        }
        _setEventListener(t, e, s, i, n) {
            s.includes("mouse") ? t.addEventListener(s, (r)=>{
                this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                    source: this,
                    detail: {
                        id: this.data.id,
                        name: i,
                        value: n(r),
                        shift: r.shiftKey,
                        modifier: this._getKeyModifier(r)
                    }
                });
            }) : t.addEventListener(s, (r)=>{
                if (s === "blur") {
                    if (!e.focused || !r.relatedTarget) return;
                    e.focused = !1;
                } else if (s === "focus") {
                    if (e.focused) return;
                    e.focused = !0;
                }
                n && this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                    source: this,
                    detail: {
                        id: this.data.id,
                        name: i,
                        value: n(r)
                    }
                });
            });
        }
        _setEventListeners(t, e, s, i) {
            for (const [n, r] of s)(r === "Action" || this.data.actions?.[r]) && ((r === "Focus" || r === "Blur") && (e ||= {
                focused: !1
            }), this._setEventListener(t, e, n, r, i), r === "Focus" && !this.data.actions?.Blur ? this._setEventListener(t, e, "blur", "Blur", null) : r === "Blur" && !this.data.actions?.Focus && this._setEventListener(t, e, "focus", "Focus", null));
        }
        _setBackgroundColor(t) {
            const e = this.data.backgroundColor || null;
            t.style.backgroundColor = e === null ? "transparent" : T.makeHexColor(e[0], e[1], e[2]);
        }
        _setTextStyle(t) {
            const e = [
                "left",
                "center",
                "right"
            ], { fontColor: s } = this.data.defaultAppearanceData, i = this.data.defaultAppearanceData.fontSize || $n, n = t.style;
            let r;
            const a = 2, o = (l)=>Math.round(10 * l) / 10;
            if (this.data.multiLine) {
                const l = Math.abs(this.data.rect[3] - this.data.rect[1] - a), h = Math.round(l / (Ce * i)) || 1, d = l / h;
                r = Math.min(i, o(d / Ce));
            } else {
                const l = Math.abs(this.data.rect[3] - this.data.rect[1] - a);
                r = Math.min(i, o(l / Ce));
            }
            n.fontSize = `calc(${r}px * var(--scale-factor))`, n.color = T.makeHexColor(s[0], s[1], s[2]), this.data.textAlignment !== null && (n.textAlign = e[this.data.textAlignment]);
        }
        _setRequired(t, e) {
            e ? t.setAttribute("required", !0) : t.removeAttribute("required"), t.setAttribute("aria-required", e);
        }
    }
    class jn extends zt {
        constructor(t){
            const e = t.renderForms || t.data.hasOwnCanvas || !t.data.hasAppearance && !!t.data.fieldValue;
            super(t, {
                isRenderable: e
            });
        }
        setPropertyOnSiblings(t, e, s, i) {
            const n = this.annotationStorage;
            for (const r of this._getElementsByName(t.name, t.id))r.domElement && (r.domElement[e] = s), n.setValue(r.id, {
                [i]: s
            });
        }
        render() {
            const t = this.annotationStorage, e = this.data.id;
            this.container.classList.add("textWidgetAnnotation");
            let s = null;
            if (this.renderForms) {
                const i = t.getValue(e, {
                    value: this.data.fieldValue
                });
                let n = i.value || "";
                const r = t.getValue(e, {
                    charLimit: this.data.maxLen
                }).charLimit;
                r && n.length > r && (n = n.slice(0, r));
                let a = i.formattedValue || this.data.textContent?.join(`
`) || null;
                a && this.data.comb && (a = a.replaceAll(/\s+/g, ""));
                const o = {
                    userValue: n,
                    formattedValue: a,
                    lastCommittedValue: null,
                    commitKey: 1,
                    focused: !1
                };
                this.data.multiLine ? (s = document.createElement("textarea"), s.textContent = a ?? n, this.data.doNotScroll && (s.style.overflowY = "hidden")) : (s = document.createElement("input"), s.type = "text", s.setAttribute("value", a ?? n), this.data.doNotScroll && (s.style.overflowX = "hidden")), this.data.hasOwnCanvas && (s.hidden = !0), $t.add(s), s.setAttribute("data-element-id", e), s.disabled = this.data.readOnly, s.name = this.data.fieldName, s.tabIndex = re, this._setRequired(s, this.data.required), r && (s.maxLength = r), s.addEventListener("input", (h)=>{
                    t.setValue(e, {
                        value: h.target.value
                    }), this.setPropertyOnSiblings(s, "value", h.target.value, "value"), o.formattedValue = null;
                }), s.addEventListener("resetform", (h)=>{
                    const d = this.data.defaultFieldValue ?? "";
                    s.value = o.userValue = d, o.formattedValue = null;
                });
                let l = (h)=>{
                    const { formattedValue: d } = o;
                    d != null && (h.target.value = d), h.target.scrollLeft = 0;
                };
                if (this.enableScripting && this.hasJSActions) {
                    s.addEventListener("focus", (d)=>{
                        if (o.focused) return;
                        const { target: u } = d;
                        o.userValue && (u.value = o.userValue), o.lastCommittedValue = u.value, o.commitKey = 1, this.data.actions?.Focus || (o.focused = !0);
                    }), s.addEventListener("updatefromsandbox", (d)=>{
                        this.showElementAndHideCanvas(d.target);
                        const u = {
                            value (f) {
                                o.userValue = f.detail.value ?? "", t.setValue(e, {
                                    value: o.userValue.toString()
                                }), f.target.value = o.userValue;
                            },
                            formattedValue (f) {
                                const { formattedValue: p } = f.detail;
                                o.formattedValue = p, p != null && f.target !== document.activeElement && (f.target.value = p), t.setValue(e, {
                                    formattedValue: p
                                });
                            },
                            selRange (f) {
                                f.target.setSelectionRange(...f.detail.selRange);
                            },
                            charLimit: (f)=>{
                                const { charLimit: p } = f.detail, { target: g } = f;
                                if (p === 0) {
                                    g.removeAttribute("maxLength");
                                    return;
                                }
                                g.setAttribute("maxLength", p);
                                let b = o.userValue;
                                !b || b.length <= p || (b = b.slice(0, p), g.value = o.userValue = b, t.setValue(e, {
                                    value: b
                                }), this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                                    source: this,
                                    detail: {
                                        id: e,
                                        name: "Keystroke",
                                        value: b,
                                        willCommit: !0,
                                        commitKey: 1,
                                        selStart: g.selectionStart,
                                        selEnd: g.selectionEnd
                                    }
                                }));
                            }
                        };
                        this._dispatchEventFromSandbox(u, d);
                    }), s.addEventListener("keydown", (d)=>{
                        o.commitKey = 1;
                        let u = -1;
                        if (d.key === "Escape" ? u = 0 : d.key === "Enter" && !this.data.multiLine ? u = 2 : d.key === "Tab" && (o.commitKey = 3), u === -1) return;
                        const { value: f } = d.target;
                        o.lastCommittedValue !== f && (o.lastCommittedValue = f, o.userValue = f, this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                            source: this,
                            detail: {
                                id: e,
                                name: "Keystroke",
                                value: f,
                                willCommit: !0,
                                commitKey: u,
                                selStart: d.target.selectionStart,
                                selEnd: d.target.selectionEnd
                            }
                        }));
                    });
                    const h = l;
                    l = null, s.addEventListener("blur", (d)=>{
                        if (!o.focused || !d.relatedTarget) return;
                        this.data.actions?.Blur || (o.focused = !1);
                        const { value: u } = d.target;
                        o.userValue = u, o.lastCommittedValue !== u && this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                            source: this,
                            detail: {
                                id: e,
                                name: "Keystroke",
                                value: u,
                                willCommit: !0,
                                commitKey: o.commitKey,
                                selStart: d.target.selectionStart,
                                selEnd: d.target.selectionEnd
                            }
                        }), h(d);
                    }), this.data.actions?.Keystroke && s.addEventListener("beforeinput", (d)=>{
                        o.lastCommittedValue = null;
                        const { data: u, target: f } = d, { value: p, selectionStart: g, selectionEnd: b } = f;
                        let m = g, A = b;
                        switch(d.inputType){
                            case "deleteWordBackward":
                                {
                                    const y = p.substring(0, g).match(/\w*[^\w]*$/);
                                    y && (m -= y[0].length);
                                    break;
                                }
                            case "deleteWordForward":
                                {
                                    const y = p.substring(g).match(/^[^\w]*\w*/);
                                    y && (A += y[0].length);
                                    break;
                                }
                            case "deleteContentBackward":
                                g === b && (m -= 1);
                                break;
                            case "deleteContentForward":
                                g === b && (A += 1);
                                break;
                        }
                        d.preventDefault(), this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                            source: this,
                            detail: {
                                id: e,
                                name: "Keystroke",
                                value: p,
                                change: u || "",
                                willCommit: !1,
                                selStart: m,
                                selEnd: A
                            }
                        });
                    }), this._setEventListeners(s, o, [
                        [
                            "focus",
                            "Focus"
                        ],
                        [
                            "blur",
                            "Blur"
                        ],
                        [
                            "mousedown",
                            "Mouse Down"
                        ],
                        [
                            "mouseenter",
                            "Mouse Enter"
                        ],
                        [
                            "mouseleave",
                            "Mouse Exit"
                        ],
                        [
                            "mouseup",
                            "Mouse Up"
                        ]
                    ], (d)=>d.target.value);
                }
                if (l && s.addEventListener("blur", l), this.data.comb) {
                    const d = (this.data.rect[2] - this.data.rect[0]) / r;
                    s.classList.add("comb"), s.style.letterSpacing = `calc(${d}px * var(--scale-factor) - 1ch)`;
                }
            } else s = document.createElement("div"), s.textContent = this.data.fieldValue, s.style.verticalAlign = "middle", s.style.display = "table-cell", this.data.hasOwnCanvas && (s.hidden = !0);
            return this._setTextStyle(s), this._setBackgroundColor(s), this._setDefaultPropertiesFromJS(s), this.container.append(s), this.container;
        }
    }
    class Un extends zt {
        constructor(t){
            super(t, {
                isRenderable: !!t.data.hasOwnCanvas
            });
        }
    }
    class Vn extends zt {
        constructor(t){
            super(t, {
                isRenderable: t.renderForms
            });
        }
        render() {
            const t = this.annotationStorage, e = this.data, s = e.id;
            let i = t.getValue(s, {
                value: e.exportValue === e.fieldValue
            }).value;
            typeof i == "string" && (i = i !== "Off", t.setValue(s, {
                value: i
            })), this.container.classList.add("buttonWidgetAnnotation", "checkBox");
            const n = document.createElement("input");
            return $t.add(n), n.setAttribute("data-element-id", s), n.disabled = e.readOnly, this._setRequired(n, this.data.required), n.type = "checkbox", n.name = e.fieldName, i && n.setAttribute("checked", !0), n.setAttribute("exportValue", e.exportValue), n.tabIndex = re, n.addEventListener("change", (r)=>{
                const { name: a, checked: o } = r.target;
                for (const l of this._getElementsByName(a, s)){
                    const h = o && l.exportValue === e.exportValue;
                    l.domElement && (l.domElement.checked = h), t.setValue(l.id, {
                        value: h
                    });
                }
                t.setValue(s, {
                    value: o
                });
            }), n.addEventListener("resetform", (r)=>{
                const a = e.defaultFieldValue || "Off";
                r.target.checked = a === e.exportValue;
            }), this.enableScripting && this.hasJSActions && (n.addEventListener("updatefromsandbox", (r)=>{
                const a = {
                    value (o) {
                        o.target.checked = o.detail.value !== "Off", t.setValue(s, {
                            value: o.target.checked
                        });
                    }
                };
                this._dispatchEventFromSandbox(a, r);
            }), this._setEventListeners(n, null, [
                [
                    "change",
                    "Validate"
                ],
                [
                    "change",
                    "Action"
                ],
                [
                    "focus",
                    "Focus"
                ],
                [
                    "blur",
                    "Blur"
                ],
                [
                    "mousedown",
                    "Mouse Down"
                ],
                [
                    "mouseenter",
                    "Mouse Enter"
                ],
                [
                    "mouseleave",
                    "Mouse Exit"
                ],
                [
                    "mouseup",
                    "Mouse Up"
                ]
            ], (r)=>r.target.checked)), this._setBackgroundColor(n), this._setDefaultPropertiesFromJS(n), this.container.append(n), this.container;
        }
    }
    class Xs extends zt {
        constructor(t){
            super(t, {
                isRenderable: t.renderForms
            });
        }
        render() {
            this.container.classList.add("buttonWidgetAnnotation", "radioButton");
            const t = this.annotationStorage, e = this.data, s = e.id;
            let i = t.getValue(s, {
                value: e.fieldValue === e.buttonValue
            }).value;
            if (typeof i == "string" && (i = i !== e.buttonValue, t.setValue(s, {
                value: i
            })), i) for (const r of this._getElementsByName(e.fieldName, s))t.setValue(r.id, {
                value: !1
            });
            const n = document.createElement("input");
            if ($t.add(n), n.setAttribute("data-element-id", s), n.disabled = e.readOnly, this._setRequired(n, this.data.required), n.type = "radio", n.name = e.fieldName, i && n.setAttribute("checked", !0), n.tabIndex = re, n.addEventListener("change", (r)=>{
                const { name: a, checked: o } = r.target;
                for (const l of this._getElementsByName(a, s))t.setValue(l.id, {
                    value: !1
                });
                t.setValue(s, {
                    value: o
                });
            }), n.addEventListener("resetform", (r)=>{
                const a = e.defaultFieldValue;
                r.target.checked = a != null && a === e.buttonValue;
            }), this.enableScripting && this.hasJSActions) {
                const r = e.buttonValue;
                n.addEventListener("updatefromsandbox", (a)=>{
                    const o = {
                        value: (l)=>{
                            const h = r === l.detail.value;
                            for (const d of this._getElementsByName(l.target.name)){
                                const u = h && d.id === s;
                                d.domElement && (d.domElement.checked = u), t.setValue(d.id, {
                                    value: u
                                });
                            }
                        }
                    };
                    this._dispatchEventFromSandbox(o, a);
                }), this._setEventListeners(n, null, [
                    [
                        "change",
                        "Validate"
                    ],
                    [
                        "change",
                        "Action"
                    ],
                    [
                        "focus",
                        "Focus"
                    ],
                    [
                        "blur",
                        "Blur"
                    ],
                    [
                        "mousedown",
                        "Mouse Down"
                    ],
                    [
                        "mouseenter",
                        "Mouse Enter"
                    ],
                    [
                        "mouseleave",
                        "Mouse Exit"
                    ],
                    [
                        "mouseup",
                        "Mouse Up"
                    ]
                ], (a)=>a.target.checked);
            }
            return this._setBackgroundColor(n), this._setDefaultPropertiesFromJS(n), this.container.append(n), this.container;
        }
    }
    class Wn extends Ws {
        constructor(t){
            super(t, {
                ignoreBorder: t.data.hasAppearance
            });
        }
        render() {
            const t = super.render();
            t.classList.add("buttonWidgetAnnotation", "pushButton");
            const e = t.lastChild;
            return this.enableScripting && this.hasJSActions && e && (this._setDefaultPropertiesFromJS(e), e.addEventListener("updatefromsandbox", (s)=>{
                this._dispatchEventFromSandbox({}, s);
            })), t;
        }
    }
    class Xn extends zt {
        constructor(t){
            super(t, {
                isRenderable: t.renderForms
            });
        }
        render() {
            this.container.classList.add("choiceWidgetAnnotation");
            const t = this.annotationStorage, e = this.data.id, s = t.getValue(e, {
                value: this.data.fieldValue
            }), i = document.createElement("select");
            $t.add(i), i.setAttribute("data-element-id", e), i.disabled = this.data.readOnly, this._setRequired(i, this.data.required), i.name = this.data.fieldName, i.tabIndex = re;
            let n = this.data.combo && this.data.options.length > 0;
            this.data.combo || (i.size = this.data.options.length, this.data.multiSelect && (i.multiple = !0)), i.addEventListener("resetform", (h)=>{
                const d = this.data.defaultFieldValue;
                for (const u of i.options)u.selected = u.value === d;
            });
            for (const h of this.data.options){
                const d = document.createElement("option");
                d.textContent = h.displayValue, d.value = h.exportValue, s.value.includes(h.exportValue) && (d.setAttribute("selected", !0), n = !1), i.append(d);
            }
            let r = null;
            if (n) {
                const h = document.createElement("option");
                h.value = " ", h.setAttribute("hidden", !0), h.setAttribute("selected", !0), i.prepend(h), r = ()=>{
                    h.remove(), i.removeEventListener("input", r), r = null;
                }, i.addEventListener("input", r);
            }
            const a = (h)=>{
                const d = h ? "value" : "textContent", { options: u, multiple: f } = i;
                return f ? Array.prototype.filter.call(u, (p)=>p.selected).map((p)=>p[d]) : u.selectedIndex === -1 ? null : u[u.selectedIndex][d];
            };
            let o = a(!1);
            const l = (h)=>{
                const d = h.target.options;
                return Array.prototype.map.call(d, (u)=>({
                        displayValue: u.textContent,
                        exportValue: u.value
                    }));
            };
            return this.enableScripting && this.hasJSActions ? (i.addEventListener("updatefromsandbox", (h)=>{
                const d = {
                    value (u) {
                        r?.();
                        const f = u.detail.value, p = new Set(Array.isArray(f) ? f : [
                            f
                        ]);
                        for (const g of i.options)g.selected = p.has(g.value);
                        t.setValue(e, {
                            value: a(!0)
                        }), o = a(!1);
                    },
                    multipleSelection (u) {
                        i.multiple = !0;
                    },
                    remove (u) {
                        const f = i.options, p = u.detail.remove;
                        f[p].selected = !1, i.remove(p), f.length > 0 && Array.prototype.findIndex.call(f, (b)=>b.selected) === -1 && (f[0].selected = !0), t.setValue(e, {
                            value: a(!0),
                            items: l(u)
                        }), o = a(!1);
                    },
                    clear (u) {
                        for(; i.length !== 0;)i.remove(0);
                        t.setValue(e, {
                            value: null,
                            items: []
                        }), o = a(!1);
                    },
                    insert (u) {
                        const { index: f, displayValue: p, exportValue: g } = u.detail.insert, b = i.children[f], m = document.createElement("option");
                        m.textContent = p, m.value = g, b ? b.before(m) : i.append(m), t.setValue(e, {
                            value: a(!0),
                            items: l(u)
                        }), o = a(!1);
                    },
                    items (u) {
                        const { items: f } = u.detail;
                        for(; i.length !== 0;)i.remove(0);
                        for (const p of f){
                            const { displayValue: g, exportValue: b } = p, m = document.createElement("option");
                            m.textContent = g, m.value = b, i.append(m);
                        }
                        i.options.length > 0 && (i.options[0].selected = !0), t.setValue(e, {
                            value: a(!0),
                            items: l(u)
                        }), o = a(!1);
                    },
                    indices (u) {
                        const f = new Set(u.detail.indices);
                        for (const p of u.target.options)p.selected = f.has(p.index);
                        t.setValue(e, {
                            value: a(!0)
                        }), o = a(!1);
                    },
                    editable (u) {
                        u.target.disabled = !u.detail.editable;
                    }
                };
                this._dispatchEventFromSandbox(d, h);
            }), i.addEventListener("input", (h)=>{
                const d = a(!0), u = a(!1);
                t.setValue(e, {
                    value: d
                }), h.preventDefault(), this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                    source: this,
                    detail: {
                        id: e,
                        name: "Keystroke",
                        value: o,
                        change: u,
                        changeEx: d,
                        willCommit: !1,
                        commitKey: 1,
                        keyDown: !1
                    }
                });
            }), this._setEventListeners(i, null, [
                [
                    "focus",
                    "Focus"
                ],
                [
                    "blur",
                    "Blur"
                ],
                [
                    "mousedown",
                    "Mouse Down"
                ],
                [
                    "mouseenter",
                    "Mouse Enter"
                ],
                [
                    "mouseleave",
                    "Mouse Exit"
                ],
                [
                    "mouseup",
                    "Mouse Up"
                ],
                [
                    "input",
                    "Action"
                ],
                [
                    "input",
                    "Validate"
                ]
            ], (h)=>h.target.value)) : i.addEventListener("input", function(h) {
                t.setValue(e, {
                    value: a(!0)
                });
            }), this.data.combo && this._setTextStyle(i), this._setBackgroundColor(i), this._setDefaultPropertiesFromJS(i), this.container.append(i), this.container;
        }
    }
    class Be extends J {
        constructor(t){
            const { data: e, elements: s } = t;
            super(t, {
                isRenderable: J._hasPopupData(e)
            }), this.elements = s, this.popup = null;
        }
        render() {
            this.container.classList.add("popupAnnotation");
            const t = this.popup = new qn({
                container: this.container,
                color: this.data.color,
                titleObj: this.data.titleObj,
                modificationDate: this.data.modificationDate,
                contentsObj: this.data.contentsObj,
                richText: this.data.richText,
                rect: this.data.rect,
                parentRect: this.data.parentRect || null,
                parent: this.parent,
                elements: this.elements,
                open: this.data.open
            }), e = [];
            for (const s of this.elements)s.popup = t, s.container.ariaHasPopup = "dialog", e.push(s.data.id), s.addHighlightArea();
            return this.container.setAttribute("aria-controls", e.map((s)=>`${Ge}${s}`).join(",")), this.container;
        }
    }
    class qn {
        #t = this.#T.bind(this);
        #e = this.#C.bind(this);
        #s = this.#P.bind(this);
        #i = this.#_.bind(this);
        #r = null;
        #n = null;
        #l = null;
        #o = null;
        #c = null;
        #h = null;
        #u = null;
        #d = !1;
        #f = null;
        #a = null;
        #p = null;
        #m = null;
        #g = null;
        #b = null;
        #v = !1;
        constructor({ container: t, color: e, elements: s, titleObj: i, modificationDate: n, contentsObj: r, richText: a, parent: o, rect: l, parentRect: h, open: d }){
            this.#n = t, this.#g = i, this.#l = r, this.#m = a, this.#h = o, this.#r = e, this.#p = l, this.#u = h, this.#c = s, this.#o = Ts.toDateObject(n), this.trigger = s.flatMap((u)=>u.getElementsToTriggerPopup());
            for (const u of this.trigger)u.addEventListener("click", this.#i), u.addEventListener("mouseenter", this.#s), u.addEventListener("mouseleave", this.#e), u.classList.add("popupTriggerArea");
            for (const u of s)u.container?.addEventListener("keydown", this.#t);
            this.#n.hidden = !0, d && this.#_();
        }
        render() {
            if (this.#f) return;
            const t = this.#f = document.createElement("div");
            if (t.className = "popup", this.#r) {
                const n = t.style.outlineColor = T.makeHexColor(...this.#r);
                CSS.supports("background-color", "color-mix(in srgb, red 30%, white)") ? t.style.backgroundColor = `color-mix(in srgb, ${n} 30%, white)` : t.style.backgroundColor = T.makeHexColor(...this.#r.map((a)=>Math.floor(.7 * (255 - a) + a)));
            }
            const e = document.createElement("span");
            e.className = "header";
            const s = document.createElement("h1");
            if (e.append(s), { dir: s.dir, str: s.textContent } = this.#g, t.append(e), this.#o) {
                const n = document.createElement("span");
                n.classList.add("popupDate"), n.setAttribute("data-l10n-id", "pdfjs-annotation-date-time-string"), n.setAttribute("data-l10n-args", JSON.stringify({
                    dateObj: this.#o.valueOf()
                })), e.append(n);
            }
            const i = this.#A;
            if (i) Vs.render({
                xfaHtml: i,
                intent: "richText",
                div: t
            }), t.lastChild.classList.add("richText", "popupContent");
            else {
                const n = this._formatContents(this.#l);
                t.append(n);
            }
            this.#n.append(t);
        }
        get #A() {
            const t = this.#m, e = this.#l;
            return t?.str && (!e?.str || e.str === t.str) && this.#m.html || null;
        }
        get #w() {
            return this.#A?.attributes?.style?.fontSize || 0;
        }
        get #S() {
            return this.#A?.attributes?.style?.color || null;
        }
        #x(t) {
            const e = [], s = {
                str: t,
                html: {
                    name: "div",
                    attributes: {
                        dir: "auto"
                    },
                    children: [
                        {
                            name: "p",
                            children: e
                        }
                    ]
                }
            }, i = {
                style: {
                    color: this.#S,
                    fontSize: this.#w ? `calc(${this.#w}px * var(--scale-factor))` : ""
                }
            };
            for (const n of t.split(`
`))e.push({
                name: "span",
                value: n,
                attributes: i
            });
            return s;
        }
        _formatContents({ str: t, dir: e }) {
            const s = document.createElement("p");
            s.classList.add("popupContent"), s.dir = e;
            const i = t.split(/(?:\r\n?|\n)/);
            for(let n = 0, r = i.length; n < r; ++n){
                const a = i[n];
                s.append(document.createTextNode(a)), n < r - 1 && s.append(document.createElement("br"));
            }
            return s;
        }
        #T(t) {
            t.altKey || t.shiftKey || t.ctrlKey || t.metaKey || (t.key === "Enter" || t.key === "Escape" && this.#d) && this.#_();
        }
        updateEdited({ rect: t, popupContent: e }) {
            this.#b ||= {
                contentsObj: this.#l,
                richText: this.#m
            }, t && (this.#a = null), e && (this.#m = this.#x(e), this.#l = null), this.#f?.remove(), this.#f = null;
        }
        resetEdited() {
            this.#b && ({ contentsObj: this.#l, richText: this.#m } = this.#b, this.#b = null, this.#f?.remove(), this.#f = null, this.#a = null);
        }
        #R() {
            if (this.#a !== null) return;
            const { page: { view: t }, viewport: { rawDims: { pageWidth: e, pageHeight: s, pageX: i, pageY: n } } } = this.#h;
            let r = !!this.#u, a = r ? this.#u : this.#p;
            for (const p of this.#c)if (!a || T.intersect(p.data.rect, a) !== null) {
                a = p.data.rect, r = !0;
                break;
            }
            const o = T.normalizeRect([
                a[0],
                t[3] - a[1] + t[1],
                a[2],
                t[3] - a[3] + t[1]
            ]), h = r ? a[2] - a[0] + 5 : 0, d = o[0] + h, u = o[1];
            this.#a = [
                100 * (d - i) / e,
                100 * (u - n) / s
            ];
            const { style: f } = this.#n;
            f.left = `${this.#a[0]}%`, f.top = `${this.#a[1]}%`;
        }
        #_() {
            this.#d = !this.#d, this.#d ? (this.#P(), this.#n.addEventListener("click", this.#i), this.#n.addEventListener("keydown", this.#t)) : (this.#C(), this.#n.removeEventListener("click", this.#i), this.#n.removeEventListener("keydown", this.#t));
        }
        #P() {
            this.#f || this.render(), this.isVisible ? this.#d && this.#n.classList.add("focused") : (this.#R(), this.#n.hidden = !1, this.#n.style.zIndex = parseInt(this.#n.style.zIndex) + 1e3);
        }
        #C() {
            this.#n.classList.remove("focused"), !(this.#d || !this.isVisible) && (this.#n.hidden = !0, this.#n.style.zIndex = parseInt(this.#n.style.zIndex) - 1e3);
        }
        forceHide() {
            this.#v = this.isVisible, this.#v && (this.#n.hidden = !0);
        }
        maybeShow() {
            this.#v && (this.#f || this.#P(), this.#v = !1, this.#n.hidden = !1);
        }
        get isVisible() {
            return this.#n.hidden === !1;
        }
    }
    class qs extends J {
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            }), this.textContent = t.data.textContent, this.textPosition = t.data.textPosition, this.annotationEditorType = F.FREETEXT;
        }
        render() {
            if (this.container.classList.add("freeTextAnnotation"), this.textContent) {
                const t = document.createElement("div");
                t.classList.add("annotationTextContent"), t.setAttribute("role", "comment");
                for (const e of this.textContent){
                    const s = document.createElement("span");
                    s.textContent = e, t.append(s);
                }
                this.container.append(t);
            }
            return !this.data.popupRef && this.hasPopupData && this._createPopup(), this._editOnDoubleClick(), this.container;
        }
    }
    class Yn extends J {
        #t = null;
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            });
        }
        render() {
            this.container.classList.add("lineAnnotation");
            const t = this.data, { width: e, height: s } = It(t.rect), i = this.svgFactory.create(e, s, !0), n = this.#t = this.svgFactory.createElement("svg:line");
            return n.setAttribute("x1", t.rect[2] - t.lineCoordinates[0]), n.setAttribute("y1", t.rect[3] - t.lineCoordinates[1]), n.setAttribute("x2", t.rect[2] - t.lineCoordinates[2]), n.setAttribute("y2", t.rect[3] - t.lineCoordinates[3]), n.setAttribute("stroke-width", t.borderStyle.width || 1), n.setAttribute("stroke", "transparent"), n.setAttribute("fill", "transparent"), i.append(n), this.container.append(i), !t.popupRef && this.hasPopupData && this._createPopup(), this.container;
        }
        getElementsToTriggerPopup() {
            return this.#t;
        }
        addHighlightArea() {
            this.container.classList.add("highlightArea");
        }
    }
    class Kn extends J {
        #t = null;
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            });
        }
        render() {
            this.container.classList.add("squareAnnotation");
            const t = this.data, { width: e, height: s } = It(t.rect), i = this.svgFactory.create(e, s, !0), n = t.borderStyle.width, r = this.#t = this.svgFactory.createElement("svg:rect");
            return r.setAttribute("x", n / 2), r.setAttribute("y", n / 2), r.setAttribute("width", e - n), r.setAttribute("height", s - n), r.setAttribute("stroke-width", n || 1), r.setAttribute("stroke", "transparent"), r.setAttribute("fill", "transparent"), i.append(r), this.container.append(i), !t.popupRef && this.hasPopupData && this._createPopup(), this.container;
        }
        getElementsToTriggerPopup() {
            return this.#t;
        }
        addHighlightArea() {
            this.container.classList.add("highlightArea");
        }
    }
    class Qn extends J {
        #t = null;
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            });
        }
        render() {
            this.container.classList.add("circleAnnotation");
            const t = this.data, { width: e, height: s } = It(t.rect), i = this.svgFactory.create(e, s, !0), n = t.borderStyle.width, r = this.#t = this.svgFactory.createElement("svg:ellipse");
            return r.setAttribute("cx", e / 2), r.setAttribute("cy", s / 2), r.setAttribute("rx", e / 2 - n / 2), r.setAttribute("ry", s / 2 - n / 2), r.setAttribute("stroke-width", n || 1), r.setAttribute("stroke", "transparent"), r.setAttribute("fill", "transparent"), i.append(r), this.container.append(i), !t.popupRef && this.hasPopupData && this._createPopup(), this.container;
        }
        getElementsToTriggerPopup() {
            return this.#t;
        }
        addHighlightArea() {
            this.container.classList.add("highlightArea");
        }
    }
    class Ys extends J {
        #t = null;
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            }), this.containerClassName = "polylineAnnotation", this.svgElementName = "svg:polyline";
        }
        render() {
            this.container.classList.add(this.containerClassName);
            const { data: { rect: t, vertices: e, borderStyle: s, popupRef: i } } = this;
            if (!e) return this.container;
            const { width: n, height: r } = It(t), a = this.svgFactory.create(n, r, !0);
            let o = [];
            for(let h = 0, d = e.length; h < d; h += 2){
                const u = e[h] - t[0], f = t[3] - e[h + 1];
                o.push(`${u},${f}`);
            }
            o = o.join(" ");
            const l = this.#t = this.svgFactory.createElement(this.svgElementName);
            return l.setAttribute("points", o), l.setAttribute("stroke-width", s.width || 1), l.setAttribute("stroke", "transparent"), l.setAttribute("fill", "transparent"), a.append(l), this.container.append(a), !i && this.hasPopupData && this._createPopup(), this.container;
        }
        getElementsToTriggerPopup() {
            return this.#t;
        }
        addHighlightArea() {
            this.container.classList.add("highlightArea");
        }
    }
    class Jn extends Ys {
        constructor(t){
            super(t), this.containerClassName = "polygonAnnotation", this.svgElementName = "svg:polygon";
        }
    }
    class Zn extends J {
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            });
        }
        render() {
            return this.container.classList.add("caretAnnotation"), !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container;
        }
    }
    class Ze extends J {
        #t = null;
        #e = [];
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            }), this.containerClassName = "inkAnnotation", this.svgElementName = "svg:polyline", this.annotationEditorType = this.data.it === "InkHighlight" ? F.HIGHLIGHT : F.INK;
        }
        #s(t, e) {
            switch(t){
                case 90:
                    return {
                        transform: `rotate(90) translate(${-e[0]},${e[1]}) scale(1,-1)`,
                        width: e[3] - e[1],
                        height: e[2] - e[0]
                    };
                case 180:
                    return {
                        transform: `rotate(180) translate(${-e[2]},${e[1]}) scale(1,-1)`,
                        width: e[2] - e[0],
                        height: e[3] - e[1]
                    };
                case 270:
                    return {
                        transform: `rotate(270) translate(${-e[2]},${e[3]}) scale(1,-1)`,
                        width: e[3] - e[1],
                        height: e[2] - e[0]
                    };
                default:
                    return {
                        transform: `translate(${-e[0]},${e[3]}) scale(1,-1)`,
                        width: e[2] - e[0],
                        height: e[3] - e[1]
                    };
            }
        }
        render() {
            this.container.classList.add(this.containerClassName);
            const { data: { rect: t, rotation: e, inkLists: s, borderStyle: i, popupRef: n } } = this, { transform: r, width: a, height: o } = this.#s(e, t), l = this.svgFactory.create(a, o, !0), h = this.#t = this.svgFactory.createElement("svg:g");
            l.append(h), h.setAttribute("stroke-width", i.width || 1), h.setAttribute("stroke-linecap", "round"), h.setAttribute("stroke-linejoin", "round"), h.setAttribute("stroke-miterlimit", 10), h.setAttribute("stroke", "transparent"), h.setAttribute("fill", "transparent"), h.setAttribute("transform", r);
            for(let d = 0, u = s.length; d < u; d++){
                const f = this.svgFactory.createElement(this.svgElementName);
                this.#e.push(f), f.setAttribute("points", s[d].join(",")), h.append(f);
            }
            return !n && this.hasPopupData && this._createPopup(), this.container.append(l), this._editOnDoubleClick(), this.container;
        }
        updateEdited(t) {
            super.updateEdited(t);
            const { thickness: e, points: s, rect: i } = t, n = this.#t;
            if (e >= 0 && n.setAttribute("stroke-width", e || 1), s) for(let r = 0, a = this.#e.length; r < a; r++)this.#e[r].setAttribute("points", s[r].join(","));
            if (i) {
                const { transform: r, width: a, height: o } = this.#s(this.data.rotation, i);
                n.parentElement.setAttribute("viewBox", `0 0 ${a} ${o}`), n.setAttribute("transform", r);
            }
        }
        getElementsToTriggerPopup() {
            return this.#e;
        }
        addHighlightArea() {
            this.container.classList.add("highlightArea");
        }
    }
    class Ks extends J {
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0,
                createQuadrilaterals: !0
            }), this.annotationEditorType = F.HIGHLIGHT;
        }
        render() {
            return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("highlightAnnotation"), this._editOnDoubleClick(), this.container;
        }
    }
    class tr extends J {
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0,
                createQuadrilaterals: !0
            });
        }
        render() {
            return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("underlineAnnotation"), this.container;
        }
    }
    class er extends J {
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0,
                createQuadrilaterals: !0
            });
        }
        render() {
            return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("squigglyAnnotation"), this.container;
        }
    }
    class sr extends J {
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0,
                createQuadrilaterals: !0
            });
        }
        render() {
            return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("strikeoutAnnotation"), this.container;
        }
    }
    class Qs extends J {
        constructor(t){
            super(t, {
                isRenderable: !0,
                ignoreBorder: !0
            }), this.annotationEditorType = F.STAMP;
        }
        render() {
            return this.container.classList.add("stampAnnotation"), this.container.setAttribute("role", "img"), !this.data.popupRef && this.hasPopupData && this._createPopup(), this._editOnDoubleClick(), this.container;
        }
    }
    class ir extends J {
        #t = null;
        constructor(t){
            super(t, {
                isRenderable: !0
            });
            const { file: e } = this.data;
            this.filename = e.filename, this.content = e.content, this.linkService.eventBus?.dispatch("fileattachmentannotation", {
                source: this,
                ...e
            });
        }
        render() {
            this.container.classList.add("fileAttachmentAnnotation");
            const { container: t, data: e } = this;
            let s;
            e.hasAppearance || e.fillAlpha === 0 ? s = document.createElement("div") : (s = document.createElement("img"), s.src = `${this.imageResourcesPath}annotation-${/paperclip/i.test(e.name) ? "paperclip" : "pushpin"}.svg`, e.fillAlpha && e.fillAlpha < 1 && (s.style = `filter: opacity(${Math.round(e.fillAlpha * 100)}%);`)), s.addEventListener("dblclick", this.#e.bind(this)), this.#t = s;
            const { isMac: i } = dt.platform;
            return t.addEventListener("keydown", (n)=>{
                n.key === "Enter" && (i ? n.metaKey : n.ctrlKey) && this.#e();
            }), !e.popupRef && this.hasPopupData ? this._createPopup() : s.classList.add("popupTriggerArea"), t.append(s), t;
        }
        getElementsToTriggerPopup() {
            return this.#t;
        }
        addHighlightArea() {
            this.container.classList.add("highlightArea");
        }
        #e() {
            this.downloadManager?.openOrDownloadData(this.content, this.filename);
        }
    }
    class nr {
        #t = null;
        #e = null;
        #s = new Map;
        #i = null;
        constructor({ div: t, accessibilityManager: e, annotationCanvasMap: s, annotationEditorUIManager: i, page: n, viewport: r, structTreeLayer: a }){
            this.div = t, this.#t = e, this.#e = s, this.#i = a || null, this.page = n, this.viewport = r, this.zIndex = 0, this._annotationEditorUIManager = i;
        }
        hasEditableAnnotations() {
            return this.#s.size > 0;
        }
        async #r(t, e) {
            const s = t.firstChild || t, i = s.id = `${Ge}${e}`, n = await this.#i?.getAriaAttributes(i);
            if (n) for (const [r, a] of n)s.setAttribute(r, a);
            this.div.append(t), this.#t?.moveElementInDOM(this.div, t, s, !1);
        }
        async render(t) {
            const { annotations: e } = t, s = this.div;
            Ht(s, this.viewport);
            const i = new Map, n = {
                data: null,
                layer: s,
                linkService: t.linkService,
                downloadManager: t.downloadManager,
                imageResourcesPath: t.imageResourcesPath || "",
                renderForms: t.renderForms !== !1,
                svgFactory: new Je,
                annotationStorage: t.annotationStorage || new qe,
                enableScripting: t.enableScripting === !0,
                hasJSActions: t.hasJSActions,
                fieldObjects: t.fieldObjects,
                parent: this,
                elements: null
            };
            for (const r of e){
                if (r.noHTML) continue;
                const a = r.annotationType === st.POPUP;
                if (a) {
                    const h = i.get(r.id);
                    if (!h) continue;
                    n.elements = h;
                } else {
                    const { width: h, height: d } = It(r.rect);
                    if (h <= 0 || d <= 0) continue;
                }
                n.data = r;
                const o = zn.create(n);
                if (!o.isRenderable) continue;
                if (!a && r.popupRef) {
                    const h = i.get(r.popupRef);
                    h ? h.push(o) : i.set(r.popupRef, [
                        o
                    ]);
                }
                const l = o.render();
                r.hidden && (l.style.visibility = "hidden"), await this.#r(l, r.id), o._isEditable && (this.#s.set(o.data.id, o), this._annotationEditorUIManager?.renderAnnotationElement(o));
            }
            this.#n();
        }
        update({ viewport: t }) {
            const e = this.div;
            this.viewport = t, Ht(e, {
                rotation: t.rotation
            }), this.#n(), e.hidden = !1;
        }
        #n() {
            if (!this.#e) return;
            const t = this.div;
            for (const [e, s] of this.#e){
                const i = t.querySelector(`[data-annotation-id="${e}"]`);
                if (!i) continue;
                s.className = "annotationContent";
                const { firstChild: n } = i;
                n ? n.nodeName === "CANVAS" ? n.replaceWith(s) : n.classList.contains("annotationContent") ? n.after(s) : n.before(s) : i.append(s);
            }
            this.#e.clear();
        }
        getEditableAnnotations() {
            return Array.from(this.#s.values());
        }
        getEditableAnnotation(t) {
            return this.#s.get(t);
        }
    }
    const de = /\r\n?|\n/g;
    class it extends I {
        #t;
        #e = "";
        #s = `${this.id}-editor`;
        #i = null;
        #r;
        static _freeTextDefaultContent = "";
        static _internalPadding = 0;
        static _defaultColor = null;
        static _defaultFontSize = 10;
        static get _keyboardManager() {
            const t = it.prototype, e = (n)=>n.isEmpty(), s = Dt.TRANSLATE_SMALL, i = Dt.TRANSLATE_BIG;
            return O(this, "_keyboardManager", new ne([
                [
                    [
                        "ctrl+s",
                        "mac+meta+s",
                        "ctrl+p",
                        "mac+meta+p"
                    ],
                    t.commitOrRemove,
                    {
                        bubbles: !0
                    }
                ],
                [
                    [
                        "ctrl+Enter",
                        "mac+meta+Enter",
                        "Escape",
                        "mac+Escape"
                    ],
                    t.commitOrRemove
                ],
                [
                    [
                        "ArrowLeft",
                        "mac+ArrowLeft"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            -s,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowLeft",
                        "mac+shift+ArrowLeft"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            -i,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ArrowRight",
                        "mac+ArrowRight"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            s,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowRight",
                        "mac+shift+ArrowRight"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            i,
                            0
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ArrowUp",
                        "mac+ArrowUp"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            0,
                            -s
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowUp",
                        "mac+shift+ArrowUp"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            0,
                            -i
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ArrowDown",
                        "mac+ArrowDown"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            0,
                            s
                        ],
                        checker: e
                    }
                ],
                [
                    [
                        "ctrl+ArrowDown",
                        "mac+shift+ArrowDown"
                    ],
                    t._translateEmpty,
                    {
                        args: [
                            0,
                            i
                        ],
                        checker: e
                    }
                ]
            ]));
        }
        static _type = "freetext";
        static _editorType = F.FREETEXT;
        constructor(t){
            super({
                ...t,
                name: "freeTextEditor"
            }), this.#t = t.color || it._defaultColor || I._defaultLineColor, this.#r = t.fontSize || it._defaultFontSize;
        }
        static initialize(t, e) {
            I.initialize(t, e);
            const s = getComputedStyle(document.documentElement);
            this._internalPadding = parseFloat(s.getPropertyValue("--freetext-padding"));
        }
        static updateDefaultParams(t, e) {
            switch(t){
                case H.FREETEXT_SIZE:
                    it._defaultFontSize = e;
                    break;
                case H.FREETEXT_COLOR:
                    it._defaultColor = e;
                    break;
            }
        }
        updateParams(t, e) {
            switch(t){
                case H.FREETEXT_SIZE:
                    this.#n(e);
                    break;
                case H.FREETEXT_COLOR:
                    this.#l(e);
                    break;
            }
        }
        static get defaultPropertiesToUpdate() {
            return [
                [
                    H.FREETEXT_SIZE,
                    it._defaultFontSize
                ],
                [
                    H.FREETEXT_COLOR,
                    it._defaultColor || I._defaultLineColor
                ]
            ];
        }
        get propertiesToUpdate() {
            return [
                [
                    H.FREETEXT_SIZE,
                    this.#r
                ],
                [
                    H.FREETEXT_COLOR,
                    this.#t
                ]
            ];
        }
        #n(t) {
            const e = (i)=>{
                this.editorDiv.style.fontSize = `calc(${i}px * var(--scale-factor))`, this.translate(0, -(i - this.#r) * this.parentScale), this.#r = i, this.#c();
            }, s = this.#r;
            this.addCommands({
                cmd: e.bind(this, t),
                undo: e.bind(this, s),
                post: this._uiManager.updateUI.bind(this._uiManager, this),
                mustExec: !0,
                type: H.FREETEXT_SIZE,
                overwriteIfSameType: !0,
                keepUndo: !0
            });
        }
        #l(t) {
            const e = (i)=>{
                this.#t = this.editorDiv.style.color = i;
            }, s = this.#t;
            this.addCommands({
                cmd: e.bind(this, t),
                undo: e.bind(this, s),
                post: this._uiManager.updateUI.bind(this._uiManager, this),
                mustExec: !0,
                type: H.FREETEXT_COLOR,
                overwriteIfSameType: !0,
                keepUndo: !0
            });
        }
        _translateEmpty(t, e) {
            this._uiManager.translateSelectedEditors(t, e, !0);
        }
        getInitialTranslation() {
            const t = this.parentScale;
            return [
                -it._internalPadding * t,
                -(it._internalPadding + this.#r) * t
            ];
        }
        rebuild() {
            this.parent && (super.rebuild(), this.div !== null && (this.isAttachedToDOM || this.parent.add(this)));
        }
        enableEditMode() {
            if (this.isInEditMode()) return;
            this.parent.setEditingState(!1), this.parent.updateToolbar(F.FREETEXT), super.enableEditMode(), this.overlayDiv.classList.remove("enabled"), this.editorDiv.contentEditable = !0, this._isDraggable = !1, this.div.removeAttribute("aria-activedescendant"), this.#i = new AbortController;
            const t = this._uiManager.combinedSignal(this.#i);
            this.editorDiv.addEventListener("keydown", this.editorDivKeydown.bind(this), {
                signal: t
            }), this.editorDiv.addEventListener("focus", this.editorDivFocus.bind(this), {
                signal: t
            }), this.editorDiv.addEventListener("blur", this.editorDivBlur.bind(this), {
                signal: t
            }), this.editorDiv.addEventListener("input", this.editorDivInput.bind(this), {
                signal: t
            }), this.editorDiv.addEventListener("paste", this.editorDivPaste.bind(this), {
                signal: t
            });
        }
        disableEditMode() {
            this.isInEditMode() && (this.parent.setEditingState(!0), super.disableEditMode(), this.overlayDiv.classList.add("enabled"), this.editorDiv.contentEditable = !1, this.div.setAttribute("aria-activedescendant", this.#s), this._isDraggable = !0, this.#i?.abort(), this.#i = null, this.div.focus({
                preventScroll: !0
            }), this.isEditing = !1, this.parent.div.classList.add("freetextEditing"));
        }
        focusin(t) {
            this._focusEventsAllowed && (super.focusin(t), t.target !== this.editorDiv && this.editorDiv.focus());
        }
        onceAdded(t) {
            this.width || (this.enableEditMode(), t && this.editorDiv.focus(), this._initialOptions?.isCentered && this.center(), this._initialOptions = null);
        }
        isEmpty() {
            return !this.editorDiv || this.editorDiv.innerText.trim() === "";
        }
        remove() {
            this.isEditing = !1, this.parent && (this.parent.setEditingState(!0), this.parent.div.classList.add("freetextEditing")), super.remove();
        }
        #o() {
            const t = [];
            this.editorDiv.normalize();
            let e = null;
            for (const s of this.editorDiv.childNodes)e?.nodeType === Node.TEXT_NODE && s.nodeName === "BR" || (t.push(it.#h(s)), e = s);
            return t.join(`
`);
        }
        #c() {
            const [t, e] = this.parentDimensions;
            let s;
            if (this.isAttachedToDOM) s = this.div.getBoundingClientRect();
            else {
                const { currentLayer: i, div: n } = this, r = n.style.display, a = n.classList.contains("hidden");
                n.classList.remove("hidden"), n.style.display = "hidden", i.div.append(this.div), s = n.getBoundingClientRect(), n.remove(), n.style.display = r, n.classList.toggle("hidden", a);
            }
            this.rotation % 180 === this.parentRotation % 180 ? (this.width = s.width / t, this.height = s.height / e) : (this.width = s.height / t, this.height = s.width / e), this.fixAndSetPosition();
        }
        commit() {
            if (!this.isInEditMode()) return;
            super.commit(), this.disableEditMode();
            const t = this.#e, e = this.#e = this.#o().trimEnd();
            if (t === e) return;
            const s = (i)=>{
                if (this.#e = i, !i) {
                    this.remove();
                    return;
                }
                this.#u(), this._uiManager.rebuild(this), this.#c();
            };
            this.addCommands({
                cmd: ()=>{
                    s(e);
                },
                undo: ()=>{
                    s(t);
                },
                mustExec: !1
            }), this.#c();
        }
        shouldGetKeyboardEvents() {
            return this.isInEditMode();
        }
        enterInEditMode() {
            this.enableEditMode(), this.editorDiv.focus();
        }
        dblclick(t) {
            this.enterInEditMode();
        }
        keydown(t) {
            t.target === this.div && t.key === "Enter" && (this.enterInEditMode(), t.preventDefault());
        }
        editorDivKeydown(t) {
            it._keyboardManager.exec(this, t);
        }
        editorDivFocus(t) {
            this.isEditing = !0;
        }
        editorDivBlur(t) {
            this.isEditing = !1;
        }
        editorDivInput(t) {
            this.parent.div.classList.toggle("freetextEditing", this.isEmpty());
        }
        disableEditing() {
            this.editorDiv.setAttribute("role", "comment"), this.editorDiv.removeAttribute("aria-multiline");
        }
        enableEditing() {
            this.editorDiv.setAttribute("role", "textbox"), this.editorDiv.setAttribute("aria-multiline", !0);
        }
        render() {
            if (this.div) return this.div;
            let t, e;
            this.width && (t = this.x, e = this.y), super.render(), this.editorDiv = document.createElement("div"), this.editorDiv.className = "internal", this.editorDiv.setAttribute("id", this.#s), this.editorDiv.setAttribute("data-l10n-id", "pdfjs-free-text2"), this.editorDiv.setAttribute("data-l10n-attrs", "default-content"), this.enableEditing(), this.editorDiv.contentEditable = !0;
            const { style: s } = this.editorDiv;
            if (s.fontSize = `calc(${this.#r}px * var(--scale-factor))`, s.color = this.#t, this.div.append(this.editorDiv), this.overlayDiv = document.createElement("div"), this.overlayDiv.classList.add("overlay", "enabled"), this.div.append(this.overlayDiv), pe(this, this.div, [
                "dblclick",
                "keydown"
            ]), this.width) {
                const [i, n] = this.parentDimensions;
                if (this.annotationElementId) {
                    const { position: r } = this._initialData;
                    let [a, o] = this.getInitialTranslation();
                    [a, o] = this.pageTranslationToScreen(a, o);
                    const [l, h] = this.pageDimensions, [d, u] = this.pageTranslation;
                    let f, p;
                    switch(this.rotation){
                        case 0:
                            f = t + (r[0] - d) / l, p = e + this.height - (r[1] - u) / h;
                            break;
                        case 90:
                            f = t + (r[0] - d) / l, p = e - (r[1] - u) / h, [a, o] = [
                                o,
                                -a
                            ];
                            break;
                        case 180:
                            f = t - this.width + (r[0] - d) / l, p = e - (r[1] - u) / h, [a, o] = [
                                -a,
                                -o
                            ];
                            break;
                        case 270:
                            f = t + (r[0] - d - this.height * h) / l, p = e + (r[1] - u - this.width * l) / h, [a, o] = [
                                -o,
                                a
                            ];
                            break;
                    }
                    this.setAt(f * i, p * n, a, o);
                } else this.setAt(t * i, e * n, this.width * i, this.height * n);
                this.#u(), this._isDraggable = !0, this.editorDiv.contentEditable = !1;
            } else this._isDraggable = !1, this.editorDiv.contentEditable = !0;
            return this.div;
        }
        static #h(t) {
            return (t.nodeType === Node.TEXT_NODE ? t.nodeValue : t.innerText).replaceAll(de, "");
        }
        editorDivPaste(t) {
            const e = t.clipboardData || window.clipboardData, { types: s } = e;
            if (s.length === 1 && s[0] === "text/plain") return;
            t.preventDefault();
            const i = it.#f(e.getData("text") || "").replaceAll(de, `
`);
            if (!i) return;
            const n = window.getSelection();
            if (!n.rangeCount) return;
            this.editorDiv.normalize(), n.deleteFromDocument();
            const r = n.getRangeAt(0);
            if (!i.includes(`
`)) {
                r.insertNode(document.createTextNode(i)), this.editorDiv.normalize(), n.collapseToStart();
                return;
            }
            const { startContainer: a, startOffset: o } = r, l = [], h = [];
            if (a.nodeType === Node.TEXT_NODE) {
                const f = a.parentElement;
                if (h.push(a.nodeValue.slice(o).replaceAll(de, "")), f !== this.editorDiv) {
                    let p = l;
                    for (const g of this.editorDiv.childNodes){
                        if (g === f) {
                            p = h;
                            continue;
                        }
                        p.push(it.#h(g));
                    }
                }
                l.push(a.nodeValue.slice(0, o).replaceAll(de, ""));
            } else if (a === this.editorDiv) {
                let f = l, p = 0;
                for (const g of this.editorDiv.childNodes)p++ === o && (f = h), f.push(it.#h(g));
            }
            this.#e = `${l.join(`
`)}${i}${h.join(`
`)}`, this.#u();
            const d = new Range;
            let u = l.reduce((f, p)=>f + p.length, 0);
            for (const { firstChild: f } of this.editorDiv.childNodes)if (f.nodeType === Node.TEXT_NODE) {
                const p = f.nodeValue.length;
                if (u <= p) {
                    d.setStart(f, u), d.setEnd(f, u);
                    break;
                }
                u -= p;
            }
            n.removeAllRanges(), n.addRange(d);
        }
        #u() {
            if (this.editorDiv.replaceChildren(), !!this.#e) for (const t of this.#e.split(`
`)){
                const e = document.createElement("div");
                e.append(t ? document.createTextNode(t) : document.createElement("br")), this.editorDiv.append(e);
            }
        }
        #d() {
            return this.#e.replaceAll(" ", " ");
        }
        static #f(t) {
            return t.replaceAll(" ", " ");
        }
        get contentDiv() {
            return this.editorDiv;
        }
        static async deserialize(t, e, s) {
            let i = null;
            if (t instanceof qs) {
                const { data: { defaultAppearanceData: { fontSize: r, fontColor: a }, rect: o, rotation: l, id: h, popupRef: d }, textContent: u, textPosition: f, parent: { page: { pageNumber: p } } } = t;
                if (!u || u.length === 0) return null;
                i = t = {
                    annotationType: F.FREETEXT,
                    color: Array.from(a),
                    fontSize: r,
                    value: u.join(`
`),
                    position: f,
                    pageIndex: p - 1,
                    rect: o.slice(0),
                    rotation: l,
                    id: h,
                    deleted: !1,
                    popupRef: d
                };
            }
            const n = await super.deserialize(t, e, s);
            return n.#r = t.fontSize, n.#t = T.makeHexColor(...t.color), n.#e = it.#f(t.value), n.annotationElementId = t.id || null, n._initialData = i, n;
        }
        serialize(t = !1) {
            if (this.isEmpty()) return null;
            if (this.deleted) return this.serializeDeleted();
            const e = it._internalPadding * this.parentScale, s = this.getRect(e, e), i = I._colorManager.convert(this.isAttachedToDOM ? getComputedStyle(this.editorDiv).color : this.#t), n = {
                annotationType: F.FREETEXT,
                color: i,
                fontSize: this.#r,
                value: this.#d(),
                pageIndex: this.pageIndex,
                rect: s,
                rotation: this.rotation,
                structTreeParentId: this._structTreeParentId
            };
            return t ? n : this.annotationElementId && !this.#a(n) ? null : (n.id = this.annotationElementId, n);
        }
        #a(t) {
            const { value: e, fontSize: s, color: i, pageIndex: n } = this._initialData;
            return this._hasBeenMoved || t.value !== e || t.fontSize !== s || t.color.some((r, a)=>r !== i[a]) || t.pageIndex !== n;
        }
        renderAnnotationElement(t) {
            const e = super.renderAnnotationElement(t);
            if (this.deleted) return e;
            const { style: s } = e;
            s.fontSize = `calc(${this.#r}px * var(--scale-factor))`, s.color = this.#t, e.replaceChildren();
            for (const n of this.#e.split(`
`)){
                const r = document.createElement("div");
                r.append(n ? document.createTextNode(n) : document.createElement("br")), e.append(r);
            }
            const i = it._internalPadding * this.parentScale;
            return t.updateEdited({
                rect: this.getRect(i, i),
                popupContent: this.#e
            }), e;
        }
        resetAnnotationElement(t) {
            super.resetAnnotationElement(t), t.resetEdited();
        }
    }
    class C {
        static PRECISION = 1e-4;
        toSVGPath() {
            V("Abstract method `toSVGPath` must be implemented.");
        }
        get box() {
            V("Abstract getter `box` must be implemented.");
        }
        serialize(t, e) {
            V("Abstract method `serialize` must be implemented.");
        }
        static _rescale(t, e, s, i, n, r) {
            r ||= new Float32Array(t.length);
            for(let a = 0, o = t.length; a < o; a += 2)r[a] = e + t[a] * i, r[a + 1] = s + t[a + 1] * n;
            return r;
        }
        static _rescaleAndSwap(t, e, s, i, n, r) {
            r ||= new Float32Array(t.length);
            for(let a = 0, o = t.length; a < o; a += 2)r[a] = e + t[a + 1] * i, r[a + 1] = s + t[a] * n;
            return r;
        }
        static _translate(t, e, s, i) {
            i ||= new Float32Array(t.length);
            for(let n = 0, r = t.length; n < r; n += 2)i[n] = e + t[n], i[n + 1] = s + t[n + 1];
            return i;
        }
        static svgRound(t) {
            return Math.round(t * 1e4);
        }
        static _normalizePoint(t, e, s, i, n) {
            switch(n){
                case 90:
                    return [
                        1 - e / s,
                        t / i
                    ];
                case 180:
                    return [
                        1 - t / s,
                        1 - e / i
                    ];
                case 270:
                    return [
                        e / s,
                        1 - t / i
                    ];
                default:
                    return [
                        t / s,
                        e / i
                    ];
            }
        }
        static _normalizePagePoint(t, e, s) {
            switch(s){
                case 90:
                    return [
                        1 - e,
                        t
                    ];
                case 180:
                    return [
                        1 - t,
                        1 - e
                    ];
                case 270:
                    return [
                        e,
                        1 - t
                    ];
                default:
                    return [
                        t,
                        e
                    ];
            }
        }
        static createBezierPoints(t, e, s, i, n, r) {
            return [
                (t + 5 * s) / 6,
                (e + 5 * i) / 6,
                (5 * s + n) / 6,
                (5 * i + r) / 6,
                (s + n) / 2,
                (i + r) / 2
            ];
        }
    }
    class Bt {
        #t;
        #e = [];
        #s;
        #i;
        #r = [];
        #n = new Float32Array(18);
        #l;
        #o;
        #c;
        #h;
        #u;
        #d;
        #f = [];
        static #a = 8;
        static #p = 2;
        static #m = Bt.#a + Bt.#p;
        constructor({ x: t, y: e }, s, i, n, r, a = 0){
            this.#t = s, this.#d = n * i, this.#i = r, this.#n.set([
                NaN,
                NaN,
                NaN,
                NaN,
                t,
                e
            ], 6), this.#s = a, this.#h = Bt.#a * i, this.#c = Bt.#m * i, this.#u = i, this.#f.push(t, e);
        }
        isEmpty() {
            return isNaN(this.#n[8]);
        }
        #g() {
            const t = this.#n.subarray(4, 6), e = this.#n.subarray(16, 18), [s, i, n, r] = this.#t;
            return [
                (this.#l + (t[0] - e[0]) / 2 - s) / n,
                (this.#o + (t[1] - e[1]) / 2 - i) / r,
                (this.#l + (e[0] - t[0]) / 2 - s) / n,
                (this.#o + (e[1] - t[1]) / 2 - i) / r
            ];
        }
        add({ x: t, y: e }) {
            this.#l = t, this.#o = e;
            const [s, i, n, r] = this.#t;
            let [a, o, l, h] = this.#n.subarray(8, 12);
            const d = t - l, u = e - h, f = Math.hypot(d, u);
            if (f < this.#c) return !1;
            const p = f - this.#h, g = p / f, b = g * d, m = g * u;
            let A = a, y = o;
            a = l, o = h, l += b, h += m, this.#f?.push(t, e);
            const v = -m / p, w = b / p, S = v * this.#d, _ = w * this.#d;
            return this.#n.set(this.#n.subarray(2, 8), 0), this.#n.set([
                l + S,
                h + _
            ], 4), this.#n.set(this.#n.subarray(14, 18), 12), this.#n.set([
                l - S,
                h - _
            ], 16), isNaN(this.#n[6]) ? (this.#r.length === 0 && (this.#n.set([
                a + S,
                o + _
            ], 2), this.#r.push(NaN, NaN, NaN, NaN, (a + S - s) / n, (o + _ - i) / r), this.#n.set([
                a - S,
                o - _
            ], 14), this.#e.push(NaN, NaN, NaN, NaN, (a - S - s) / n, (o - _ - i) / r)), this.#n.set([
                A,
                y,
                a,
                o,
                l,
                h
            ], 6), !this.isEmpty()) : (this.#n.set([
                A,
                y,
                a,
                o,
                l,
                h
            ], 6), Math.abs(Math.atan2(y - o, A - a) - Math.atan2(m, b)) < Math.PI / 2 ? ([a, o, l, h] = this.#n.subarray(2, 6), this.#r.push(NaN, NaN, NaN, NaN, ((a + l) / 2 - s) / n, ((o + h) / 2 - i) / r), [a, o, A, y] = this.#n.subarray(14, 18), this.#e.push(NaN, NaN, NaN, NaN, ((A + a) / 2 - s) / n, ((y + o) / 2 - i) / r), !0) : ([A, y, a, o, l, h] = this.#n.subarray(0, 6), this.#r.push(((A + 5 * a) / 6 - s) / n, ((y + 5 * o) / 6 - i) / r, ((5 * a + l) / 6 - s) / n, ((5 * o + h) / 6 - i) / r, ((a + l) / 2 - s) / n, ((o + h) / 2 - i) / r), [l, h, a, o, A, y] = this.#n.subarray(12, 18), this.#e.push(((A + 5 * a) / 6 - s) / n, ((y + 5 * o) / 6 - i) / r, ((5 * a + l) / 6 - s) / n, ((5 * o + h) / 6 - i) / r, ((a + l) / 2 - s) / n, ((o + h) / 2 - i) / r), !0));
        }
        toSVGPath() {
            if (this.isEmpty()) return "";
            const t = this.#r, e = this.#e;
            if (isNaN(this.#n[6]) && !this.isEmpty()) return this.#b();
            const s = [];
            s.push(`M${t[4]} ${t[5]}`);
            for(let i = 6; i < t.length; i += 6)isNaN(t[i]) ? s.push(`L${t[i + 4]} ${t[i + 5]}`) : s.push(`C${t[i]} ${t[i + 1]} ${t[i + 2]} ${t[i + 3]} ${t[i + 4]} ${t[i + 5]}`);
            this.#A(s);
            for(let i = e.length - 6; i >= 6; i -= 6)isNaN(e[i]) ? s.push(`L${e[i + 4]} ${e[i + 5]}`) : s.push(`C${e[i]} ${e[i + 1]} ${e[i + 2]} ${e[i + 3]} ${e[i + 4]} ${e[i + 5]}`);
            return this.#v(s), s.join(" ");
        }
        #b() {
            const [t, e, s, i] = this.#t, [n, r, a, o] = this.#g();
            return `M${(this.#n[2] - t) / s} ${(this.#n[3] - e) / i} L${(this.#n[4] - t) / s} ${(this.#n[5] - e) / i} L${n} ${r} L${a} ${o} L${(this.#n[16] - t) / s} ${(this.#n[17] - e) / i} L${(this.#n[14] - t) / s} ${(this.#n[15] - e) / i} Z`;
        }
        #v(t) {
            const e = this.#e;
            t.push(`L${e[4]} ${e[5]} Z`);
        }
        #A(t) {
            const [e, s, i, n] = this.#t, r = this.#n.subarray(4, 6), a = this.#n.subarray(16, 18), [o, l, h, d] = this.#g();
            t.push(`L${(r[0] - e) / i} ${(r[1] - s) / n} L${o} ${l} L${h} ${d} L${(a[0] - e) / i} ${(a[1] - s) / n}`);
        }
        newFreeDrawOutline(t, e, s, i, n, r) {
            return new Js(t, e, s, i, n, r);
        }
        getOutlines() {
            const t = this.#r, e = this.#e, s = this.#n, [i, n, r, a] = this.#t, o = new Float32Array((this.#f?.length ?? 0) + 2);
            for(let d = 0, u = o.length - 2; d < u; d += 2)o[d] = (this.#f[d] - i) / r, o[d + 1] = (this.#f[d + 1] - n) / a;
            if (o[o.length - 2] = (this.#l - i) / r, o[o.length - 1] = (this.#o - n) / a, isNaN(s[6]) && !this.isEmpty()) return this.#w(o);
            const l = new Float32Array(this.#r.length + 24 + this.#e.length);
            let h = t.length;
            for(let d = 0; d < h; d += 2){
                if (isNaN(t[d])) {
                    l[d] = l[d + 1] = NaN;
                    continue;
                }
                l[d] = t[d], l[d + 1] = t[d + 1];
            }
            h = this.#x(l, h);
            for(let d = e.length - 6; d >= 6; d -= 6)for(let u = 0; u < 6; u += 2){
                if (isNaN(e[d + u])) {
                    l[h] = l[h + 1] = NaN, h += 2;
                    continue;
                }
                l[h] = e[d + u], l[h + 1] = e[d + u + 1], h += 2;
            }
            return this.#S(l, h), this.newFreeDrawOutline(l, o, this.#t, this.#u, this.#s, this.#i);
        }
        #w(t) {
            const e = this.#n, [s, i, n, r] = this.#t, [a, o, l, h] = this.#g(), d = new Float32Array(36);
            return d.set([
                NaN,
                NaN,
                NaN,
                NaN,
                (e[2] - s) / n,
                (e[3] - i) / r,
                NaN,
                NaN,
                NaN,
                NaN,
                (e[4] - s) / n,
                (e[5] - i) / r,
                NaN,
                NaN,
                NaN,
                NaN,
                a,
                o,
                NaN,
                NaN,
                NaN,
                NaN,
                l,
                h,
                NaN,
                NaN,
                NaN,
                NaN,
                (e[16] - s) / n,
                (e[17] - i) / r,
                NaN,
                NaN,
                NaN,
                NaN,
                (e[14] - s) / n,
                (e[15] - i) / r
            ], 0), this.newFreeDrawOutline(d, t, this.#t, this.#u, this.#s, this.#i);
        }
        #S(t, e) {
            const s = this.#e;
            return t.set([
                NaN,
                NaN,
                NaN,
                NaN,
                s[4],
                s[5]
            ], e), e += 6;
        }
        #x(t, e) {
            const s = this.#n.subarray(4, 6), i = this.#n.subarray(16, 18), [n, r, a, o] = this.#t, [l, h, d, u] = this.#g();
            return t.set([
                NaN,
                NaN,
                NaN,
                NaN,
                (s[0] - n) / a,
                (s[1] - r) / o,
                NaN,
                NaN,
                NaN,
                NaN,
                l,
                h,
                NaN,
                NaN,
                NaN,
                NaN,
                d,
                u,
                NaN,
                NaN,
                NaN,
                NaN,
                (i[0] - n) / a,
                (i[1] - r) / o
            ], e), e += 24;
        }
    }
    class Js extends C {
        #t;
        #e = new Float32Array(4);
        #s;
        #i;
        #r;
        #n;
        #l;
        constructor(t, e, s, i, n, r){
            super(), this.#l = t, this.#r = e, this.#t = s, this.#n = i, this.#s = n, this.#i = r, this.lastPoint = [
                NaN,
                NaN
            ], this.#o(r);
            const [a, o, l, h] = this.#e;
            for(let d = 0, u = t.length; d < u; d += 2)t[d] = (t[d] - a) / l, t[d + 1] = (t[d + 1] - o) / h;
            for(let d = 0, u = e.length; d < u; d += 2)e[d] = (e[d] - a) / l, e[d + 1] = (e[d + 1] - o) / h;
        }
        toSVGPath() {
            const t = [
                `M${this.#l[4]} ${this.#l[5]}`
            ];
            for(let e = 6, s = this.#l.length; e < s; e += 6){
                if (isNaN(this.#l[e])) {
                    t.push(`L${this.#l[e + 4]} ${this.#l[e + 5]}`);
                    continue;
                }
                t.push(`C${this.#l[e]} ${this.#l[e + 1]} ${this.#l[e + 2]} ${this.#l[e + 3]} ${this.#l[e + 4]} ${this.#l[e + 5]}`);
            }
            return t.push("Z"), t.join(" ");
        }
        serialize([t, e, s, i], n) {
            const r = s - t, a = i - e;
            let o, l;
            switch(n){
                case 0:
                    o = C._rescale(this.#l, t, i, r, -a), l = C._rescale(this.#r, t, i, r, -a);
                    break;
                case 90:
                    o = C._rescaleAndSwap(this.#l, t, e, r, a), l = C._rescaleAndSwap(this.#r, t, e, r, a);
                    break;
                case 180:
                    o = C._rescale(this.#l, s, e, -r, a), l = C._rescale(this.#r, s, e, -r, a);
                    break;
                case 270:
                    o = C._rescaleAndSwap(this.#l, s, i, -r, -a), l = C._rescaleAndSwap(this.#r, s, i, -r, -a);
                    break;
            }
            return {
                outline: Array.from(o),
                points: [
                    Array.from(l)
                ]
            };
        }
        #o(t) {
            const e = this.#l;
            let s = e[4], i = e[5], n = s, r = i, a = s, o = i, l = s, h = i;
            const d = t ? Math.max : Math.min;
            for(let f = 6, p = e.length; f < p; f += 6){
                if (isNaN(e[f])) n = Math.min(n, e[f + 4]), r = Math.min(r, e[f + 5]), a = Math.max(a, e[f + 4]), o = Math.max(o, e[f + 5]), h < e[f + 5] ? (l = e[f + 4], h = e[f + 5]) : h === e[f + 5] && (l = d(l, e[f + 4]));
                else {
                    const g = T.bezierBoundingBox(s, i, ...e.slice(f, f + 6));
                    n = Math.min(n, g[0]), r = Math.min(r, g[1]), a = Math.max(a, g[2]), o = Math.max(o, g[3]), h < g[3] ? (l = g[2], h = g[3]) : h === g[3] && (l = d(l, g[2]));
                }
                s = e[f + 4], i = e[f + 5];
            }
            const u = this.#e;
            u[0] = n - this.#s, u[1] = r - this.#s, u[2] = a - n + 2 * this.#s, u[3] = o - r + 2 * this.#s, this.lastPoint = [
                l,
                h
            ];
        }
        get box() {
            return this.#e;
        }
        newOutliner(t, e, s, i, n, r = 0) {
            return new Bt(t, e, s, i, n, r);
        }
        getNewOutline(t, e) {
            const [s, i, n, r] = this.#e, [a, o, l, h] = this.#t, d = n * l, u = r * h, f = s * l + a, p = i * h + o, g = this.newOutliner({
                x: this.#r[0] * d + f,
                y: this.#r[1] * u + p
            }, this.#t, this.#n, t, this.#i, e ?? this.#s);
            for(let b = 2; b < this.#r.length; b += 2)g.add({
                x: this.#r[b] * d + f,
                y: this.#r[b + 1] * u + p
            });
            return g.getOutlines();
        }
    }
    class He {
        #t;
        #e;
        #s = [];
        #i = [];
        constructor(t, e = 0, s = 0, i = !0){
            let n = 1 / 0, r = -1 / 0, a = 1 / 0, o = -1 / 0;
            const l = 10 ** -4;
            for (const { x: b, y: m, width: A, height: y } of t){
                const v = Math.floor((b - e) / l) * l, w = Math.ceil((b + A + e) / l) * l, S = Math.floor((m - e) / l) * l, _ = Math.ceil((m + y + e) / l) * l, R = [
                    v,
                    S,
                    _,
                    !0
                ], M = [
                    w,
                    S,
                    _,
                    !1
                ];
                this.#s.push(R, M), n = Math.min(n, v), r = Math.max(r, w), a = Math.min(a, S), o = Math.max(o, _);
            }
            const h = r - n + 2 * s, d = o - a + 2 * s, u = n - s, f = a - s, p = this.#s.at(i ? -1 : -2), g = [
                p[0],
                p[2]
            ];
            for (const b of this.#s){
                const [m, A, y] = b;
                b[0] = (m - u) / h, b[1] = (A - f) / d, b[2] = (y - f) / d;
            }
            this.#t = new Float32Array([
                u,
                f,
                h,
                d
            ]), this.#e = g;
        }
        getOutlines() {
            this.#s.sort((e, s)=>e[0] - s[0] || e[1] - s[1] || e[2] - s[2]);
            const t = [];
            for (const e of this.#s)e[3] ? (t.push(...this.#c(e)), this.#l(e)) : (this.#o(e), t.push(...this.#c(e)));
            return this.#r(t);
        }
        #r(t) {
            const e = [], s = new Set;
            for (const r of t){
                const [a, o, l] = r;
                e.push([
                    a,
                    o,
                    r
                ], [
                    a,
                    l,
                    r
                ]);
            }
            e.sort((r, a)=>r[1] - a[1] || r[0] - a[0]);
            for(let r = 0, a = e.length; r < a; r += 2){
                const o = e[r][2], l = e[r + 1][2];
                o.push(l), l.push(o), s.add(o), s.add(l);
            }
            const i = [];
            let n;
            for(; s.size > 0;){
                const r = s.values().next().value;
                let [a, o, l, h, d] = r;
                s.delete(r);
                let u = a, f = o;
                for(n = [
                    a,
                    l
                ], i.push(n);;){
                    let p;
                    if (s.has(h)) p = h;
                    else if (s.has(d)) p = d;
                    else break;
                    s.delete(p), [a, o, l, h, d] = p, u !== a && (n.push(u, f, a, f === o ? o : l), u = a), f = f === o ? l : o;
                }
                n.push(u, f);
            }
            return new rr(i, this.#t, this.#e);
        }
        #n(t) {
            const e = this.#i;
            let s = 0, i = e.length - 1;
            for(; s <= i;){
                const n = s + i >> 1, r = e[n][0];
                if (r === t) return n;
                r < t ? s = n + 1 : i = n - 1;
            }
            return i + 1;
        }
        #l([, t, e]) {
            const s = this.#n(t);
            this.#i.splice(s, 0, [
                t,
                e
            ]);
        }
        #o([, t, e]) {
            const s = this.#n(t);
            for(let i = s; i < this.#i.length; i++){
                const [n, r] = this.#i[i];
                if (n !== t) break;
                if (n === t && r === e) {
                    this.#i.splice(i, 1);
                    return;
                }
            }
            for(let i = s - 1; i >= 0; i--){
                const [n, r] = this.#i[i];
                if (n !== t) break;
                if (n === t && r === e) {
                    this.#i.splice(i, 1);
                    return;
                }
            }
        }
        #c(t) {
            const [e, s, i] = t, n = [
                [
                    e,
                    s,
                    i
                ]
            ], r = this.#n(i);
            for(let a = 0; a < r; a++){
                const [o, l] = this.#i[a];
                for(let h = 0, d = n.length; h < d; h++){
                    const [, u, f] = n[h];
                    if (!(l <= u || f <= o)) {
                        if (u >= o) {
                            if (f > l) n[h][1] = l;
                            else {
                                if (d === 1) return [];
                                n.splice(h, 1), h--, d--;
                            }
                            continue;
                        }
                        n[h][2] = o, f > l && n.push([
                            e,
                            l,
                            f
                        ]);
                    }
                }
            }
            return n;
        }
    }
    class rr extends C {
        #t;
        #e;
        constructor(t, e, s){
            super(), this.#e = t, this.#t = e, this.lastPoint = s;
        }
        toSVGPath() {
            const t = [];
            for (const e of this.#e){
                let [s, i] = e;
                t.push(`M${s} ${i}`);
                for(let n = 2; n < e.length; n += 2){
                    const r = e[n], a = e[n + 1];
                    r === s ? (t.push(`V${a}`), i = a) : a === i && (t.push(`H${r}`), s = r);
                }
                t.push("Z");
            }
            return t.join(" ");
        }
        serialize([t, e, s, i], n) {
            const r = [], a = s - t, o = i - e;
            for (const l of this.#e){
                const h = new Array(l.length);
                for(let d = 0; d < l.length; d += 2)h[d] = t + l[d] * a, h[d + 1] = i - l[d + 1] * o;
                r.push(h);
            }
            return r;
        }
        get box() {
            return this.#t;
        }
        get classNamesForOutlining() {
            return [
                "highlightOutline"
            ];
        }
    }
    class $e extends Bt {
        newFreeDrawOutline(t, e, s, i, n, r) {
            return new ar(t, e, s, i, n, r);
        }
    }
    class ar extends Js {
        newOutliner(t, e, s, i, n, r = 0) {
            return new $e(t, e, s, i, n, r);
        }
    }
    class yt {
        #t = null;
        #e = null;
        #s;
        #i = null;
        #r = !1;
        #n = !1;
        #l = null;
        #o;
        #c = null;
        #h = null;
        #u;
        static #d = null;
        static get _keyboardManager() {
            return O(this, "_keyboardManager", new ne([
                [
                    [
                        "Escape",
                        "mac+Escape"
                    ],
                    yt.prototype._hideDropdownFromKeyboard
                ],
                [
                    [
                        " ",
                        "mac+ "
                    ],
                    yt.prototype._colorSelectFromKeyboard
                ],
                [
                    [
                        "ArrowDown",
                        "ArrowRight",
                        "mac+ArrowDown",
                        "mac+ArrowRight"
                    ],
                    yt.prototype._moveToNext
                ],
                [
                    [
                        "ArrowUp",
                        "ArrowLeft",
                        "mac+ArrowUp",
                        "mac+ArrowLeft"
                    ],
                    yt.prototype._moveToPrevious
                ],
                [
                    [
                        "Home",
                        "mac+Home"
                    ],
                    yt.prototype._moveToBeginning
                ],
                [
                    [
                        "End",
                        "mac+End"
                    ],
                    yt.prototype._moveToEnd
                ]
            ]));
        }
        constructor({ editor: t = null, uiManager: e = null }){
            t ? (this.#n = !1, this.#u = H.HIGHLIGHT_COLOR, this.#l = t) : (this.#n = !0, this.#u = H.HIGHLIGHT_DEFAULT_COLOR), this.#h = t?._uiManager || e, this.#o = this.#h._eventBus, this.#s = t?.color || this.#h?.highlightColors.values().next().value || "#FFFF98", yt.#d ||= Object.freeze({
                blue: "pdfjs-editor-colorpicker-blue",
                green: "pdfjs-editor-colorpicker-green",
                pink: "pdfjs-editor-colorpicker-pink",
                red: "pdfjs-editor-colorpicker-red",
                yellow: "pdfjs-editor-colorpicker-yellow"
            });
        }
        renderButton() {
            const t = this.#t = document.createElement("button");
            t.className = "colorPicker", t.tabIndex = "0", t.setAttribute("data-l10n-id", "pdfjs-editor-colorpicker-button"), t.setAttribute("aria-haspopup", !0);
            const e = this.#h._signal;
            t.addEventListener("click", this.#m.bind(this), {
                signal: e
            }), t.addEventListener("keydown", this.#p.bind(this), {
                signal: e
            });
            const s = this.#e = document.createElement("span");
            return s.className = "swatch", s.setAttribute("aria-hidden", !0), s.style.backgroundColor = this.#s, t.append(s), t;
        }
        renderMainDropdown() {
            const t = this.#i = this.#f();
            return t.setAttribute("aria-orientation", "horizontal"), t.setAttribute("aria-labelledby", "highlightColorPickerLabel"), t;
        }
        #f() {
            const t = document.createElement("div"), e = this.#h._signal;
            t.addEventListener("contextmenu", _t, {
                signal: e
            }), t.className = "dropdown", t.role = "listbox", t.setAttribute("aria-multiselectable", !1), t.setAttribute("aria-orientation", "vertical"), t.setAttribute("data-l10n-id", "pdfjs-editor-colorpicker-dropdown");
            for (const [s, i] of this.#h.highlightColors){
                const n = document.createElement("button");
                n.tabIndex = "0", n.role = "option", n.setAttribute("data-color", i), n.title = s, n.setAttribute("data-l10n-id", yt.#d[s]);
                const r = document.createElement("span");
                n.append(r), r.className = "swatch", r.style.backgroundColor = i, n.setAttribute("aria-selected", i === this.#s), n.addEventListener("click", this.#a.bind(this, i), {
                    signal: e
                }), t.append(n);
            }
            return t.addEventListener("keydown", this.#p.bind(this), {
                signal: e
            }), t;
        }
        #a(t, e) {
            e.stopPropagation(), this.#o.dispatch("switchannotationeditorparams", {
                source: this,
                type: this.#u,
                value: t
            });
        }
        _colorSelectFromKeyboard(t) {
            if (t.target === this.#t) {
                this.#m(t);
                return;
            }
            const e = t.target.getAttribute("data-color");
            e && this.#a(e, t);
        }
        _moveToNext(t) {
            if (!this.#b) {
                this.#m(t);
                return;
            }
            if (t.target === this.#t) {
                this.#i.firstChild?.focus();
                return;
            }
            t.target.nextSibling?.focus();
        }
        _moveToPrevious(t) {
            if (t.target === this.#i?.firstChild || t.target === this.#t) {
                this.#b && this._hideDropdownFromKeyboard();
                return;
            }
            this.#b || this.#m(t), t.target.previousSibling?.focus();
        }
        _moveToBeginning(t) {
            if (!this.#b) {
                this.#m(t);
                return;
            }
            this.#i.firstChild?.focus();
        }
        _moveToEnd(t) {
            if (!this.#b) {
                this.#m(t);
                return;
            }
            this.#i.lastChild?.focus();
        }
        #p(t) {
            yt._keyboardManager.exec(this, t);
        }
        #m(t) {
            if (this.#b) {
                this.hideDropdown();
                return;
            }
            if (this.#r = t.detail === 0, this.#c || (this.#c = new AbortController, window.addEventListener("pointerdown", this.#g.bind(this), {
                signal: this.#h.combinedSignal(this.#c)
            })), this.#i) {
                this.#i.classList.remove("hidden");
                return;
            }
            const e = this.#i = this.#f();
            this.#t.append(e);
        }
        #g(t) {
            this.#i?.contains(t.target) || this.hideDropdown();
        }
        hideDropdown() {
            this.#i?.classList.add("hidden"), this.#c?.abort(), this.#c = null;
        }
        get #b() {
            return this.#i && !this.#i.classList.contains("hidden");
        }
        _hideDropdownFromKeyboard() {
            if (!this.#n) {
                if (!this.#b) {
                    this.#l?.unselect();
                    return;
                }
                this.hideDropdown(), this.#t.focus({
                    preventScroll: !0,
                    focusVisible: this.#r
                });
            }
        }
        updateColor(t) {
            if (this.#e && (this.#e.style.backgroundColor = t), !this.#i) return;
            const e = this.#h.highlightColors.values();
            for (const s of this.#i.children)s.setAttribute("aria-selected", e.next().value === t);
        }
        destroy() {
            this.#t?.remove(), this.#t = null, this.#e = null, this.#i?.remove(), this.#i = null;
        }
    }
    class Q extends I {
        #t = null;
        #e = 0;
        #s;
        #i = null;
        #r = null;
        #n = null;
        #l = null;
        #o = 0;
        #c = null;
        #h = null;
        #u = null;
        #d = !1;
        #f = null;
        #a;
        #p = null;
        #m = "";
        #g;
        #b = "";
        static _defaultColor = null;
        static _defaultOpacity = 1;
        static _defaultThickness = 12;
        static _type = "highlight";
        static _editorType = F.HIGHLIGHT;
        static _freeHighlightId = -1;
        static _freeHighlight = null;
        static _freeHighlightClipId = "";
        static get _keyboardManager() {
            const t = Q.prototype;
            return O(this, "_keyboardManager", new ne([
                [
                    [
                        "ArrowLeft",
                        "mac+ArrowLeft"
                    ],
                    t._moveCaret,
                    {
                        args: [
                            0
                        ]
                    }
                ],
                [
                    [
                        "ArrowRight",
                        "mac+ArrowRight"
                    ],
                    t._moveCaret,
                    {
                        args: [
                            1
                        ]
                    }
                ],
                [
                    [
                        "ArrowUp",
                        "mac+ArrowUp"
                    ],
                    t._moveCaret,
                    {
                        args: [
                            2
                        ]
                    }
                ],
                [
                    [
                        "ArrowDown",
                        "mac+ArrowDown"
                    ],
                    t._moveCaret,
                    {
                        args: [
                            3
                        ]
                    }
                ]
            ]));
        }
        constructor(t){
            super({
                ...t,
                name: "highlightEditor"
            }), this.color = t.color || Q._defaultColor, this.#g = t.thickness || Q._defaultThickness, this.#a = t.opacity || Q._defaultOpacity, this.#s = t.boxes || null, this.#b = t.methodOfCreation || "", this.#m = t.text || "", this._isDraggable = !1, t.highlightId > -1 ? (this.#d = !0, this.#A(t), this.#R()) : this.#s && (this.#t = t.anchorNode, this.#e = t.anchorOffset, this.#l = t.focusNode, this.#o = t.focusOffset, this.#v(), this.#R(), this.rotate(this.rotation));
        }
        get telemetryInitialData() {
            return {
                action: "added",
                type: this.#d ? "free_highlight" : "highlight",
                color: this._uiManager.highlightColorNames.get(this.color),
                thickness: this.#g,
                methodOfCreation: this.#b
            };
        }
        get telemetryFinalData() {
            return {
                type: "highlight",
                color: this._uiManager.highlightColorNames.get(this.color)
            };
        }
        static computeTelemetryFinalData(t) {
            return {
                numberOfColors: t.get("color").size
            };
        }
        #v() {
            const t = new He(this.#s, .001);
            this.#h = t.getOutlines(), [this.x, this.y, this.width, this.height] = this.#h.box;
            const e = new He(this.#s, .0025, .001, this._uiManager.direction === "ltr");
            this.#n = e.getOutlines();
            const { lastPoint: s } = this.#n;
            this.#f = [
                (s[0] - this.x) / this.width,
                (s[1] - this.y) / this.height
            ];
        }
        #A({ highlightOutlines: t, highlightId: e, clipPathId: s }) {
            this.#h = t;
            const i = 1.5;
            if (this.#n = t.getNewOutline(this.#g / 2 + i, .0025), e >= 0) this.#u = e, this.#i = s, this.parent.drawLayer.finalizeDraw(e, {
                bbox: t.box,
                path: {
                    d: t.toSVGPath()
                }
            }), this.#p = this.parent.drawLayer.drawOutline({
                rootClass: {
                    highlightOutline: !0,
                    free: !0
                },
                bbox: this.#n.box,
                path: {
                    d: this.#n.toSVGPath()
                }
            }, !0);
            else if (this.parent) {
                const h = this.parent.viewport.rotation;
                this.parent.drawLayer.updateProperties(this.#u, {
                    bbox: Q.#_(this.#h.box, (h - this.rotation + 360) % 360),
                    path: {
                        d: t.toSVGPath()
                    }
                }), this.parent.drawLayer.updateProperties(this.#p, {
                    bbox: Q.#_(this.#n.box, h),
                    path: {
                        d: this.#n.toSVGPath()
                    }
                });
            }
            const [n, r, a, o] = t.box;
            switch(this.rotation){
                case 0:
                    this.x = n, this.y = r, this.width = a, this.height = o;
                    break;
                case 90:
                    {
                        const [h, d] = this.parentDimensions;
                        this.x = r, this.y = 1 - n, this.width = a * d / h, this.height = o * h / d;
                        break;
                    }
                case 180:
                    this.x = 1 - n, this.y = 1 - r, this.width = a, this.height = o;
                    break;
                case 270:
                    {
                        const [h, d] = this.parentDimensions;
                        this.x = 1 - r, this.y = n, this.width = a * d / h, this.height = o * h / d;
                        break;
                    }
            }
            const { lastPoint: l } = this.#n;
            this.#f = [
                (l[0] - n) / a,
                (l[1] - r) / o
            ];
        }
        static initialize(t, e) {
            I.initialize(t, e), Q._defaultColor ||= e.highlightColors?.values().next().value || "#fff066";
        }
        static updateDefaultParams(t, e) {
            switch(t){
                case H.HIGHLIGHT_DEFAULT_COLOR:
                    Q._defaultColor = e;
                    break;
                case H.HIGHLIGHT_THICKNESS:
                    Q._defaultThickness = e;
                    break;
            }
        }
        translateInPage(t, e) {}
        get toolbarPosition() {
            return this.#f;
        }
        updateParams(t, e) {
            switch(t){
                case H.HIGHLIGHT_COLOR:
                    this.#w(e);
                    break;
                case H.HIGHLIGHT_THICKNESS:
                    this.#S(e);
                    break;
            }
        }
        static get defaultPropertiesToUpdate() {
            return [
                [
                    H.HIGHLIGHT_DEFAULT_COLOR,
                    Q._defaultColor
                ],
                [
                    H.HIGHLIGHT_THICKNESS,
                    Q._defaultThickness
                ]
            ];
        }
        get propertiesToUpdate() {
            return [
                [
                    H.HIGHLIGHT_COLOR,
                    this.color || Q._defaultColor
                ],
                [
                    H.HIGHLIGHT_THICKNESS,
                    this.#g || Q._defaultThickness
                ],
                [
                    H.HIGHLIGHT_FREE,
                    this.#d
                ]
            ];
        }
        #w(t) {
            const e = (n, r)=>{
                this.color = n, this.#a = r, this.parent?.drawLayer.updateProperties(this.#u, {
                    root: {
                        fill: n,
                        "fill-opacity": r
                    }
                }), this.#r?.updateColor(n);
            }, s = this.color, i = this.#a;
            this.addCommands({
                cmd: e.bind(this, t, Q._defaultOpacity),
                undo: e.bind(this, s, i),
                post: this._uiManager.updateUI.bind(this._uiManager, this),
                mustExec: !0,
                type: H.HIGHLIGHT_COLOR,
                overwriteIfSameType: !0,
                keepUndo: !0
            }), this._reportTelemetry({
                action: "color_changed",
                color: this._uiManager.highlightColorNames.get(t)
            }, !0);
        }
        #S(t) {
            const e = this.#g, s = (i)=>{
                this.#g = i, this.#x(i);
            };
            this.addCommands({
                cmd: s.bind(this, t),
                undo: s.bind(this, e),
                post: this._uiManager.updateUI.bind(this._uiManager, this),
                mustExec: !0,
                type: H.INK_THICKNESS,
                overwriteIfSameType: !0,
                keepUndo: !0
            }), this._reportTelemetry({
                action: "thickness_changed",
                thickness: t
            }, !0);
        }
        async addEditToolbar() {
            const t = await super.addEditToolbar();
            return t ? (this._uiManager.highlightColors && (this.#r = new yt({
                editor: this
            }), t.addColorPicker(this.#r)), t) : null;
        }
        disableEditing() {
            super.disableEditing(), this.div.classList.toggle("disabled", !0);
        }
        enableEditing() {
            super.enableEditing(), this.div.classList.toggle("disabled", !1);
        }
        fixAndSetPosition() {
            return super.fixAndSetPosition(this.#k());
        }
        getBaseTranslation() {
            return [
                0,
                0
            ];
        }
        getRect(t, e) {
            return super.getRect(t, e, this.#k());
        }
        onceAdded(t) {
            this.annotationElementId || this.parent.addUndoableEditor(this), t && this.div.focus();
        }
        remove() {
            this.#T(), this._reportTelemetry({
                action: "deleted"
            }), super.remove();
        }
        rebuild() {
            this.parent && (super.rebuild(), this.div !== null && (this.#R(), this.isAttachedToDOM || this.parent.add(this)));
        }
        setParent(t) {
            let e = !1;
            this.parent && !t ? this.#T() : t && (this.#R(t), e = !this.parent && this.div?.classList.contains("selectedEditor")), super.setParent(t), this.show(this._isVisible), e && this.select();
        }
        #x(t) {
            if (!this.#d) return;
            this.#A({
                highlightOutlines: this.#h.getNewOutline(t / 2)
            }), this.fixAndSetPosition();
            const [e, s] = this.parentDimensions;
            this.setDims(this.width * e, this.height * s);
        }
        #T() {
            this.#u === null || !this.parent || (this.parent.drawLayer.remove(this.#u), this.#u = null, this.parent.drawLayer.remove(this.#p), this.#p = null);
        }
        #R(t = this.parent) {
            this.#u === null && ({ id: this.#u, clipPathId: this.#i } = t.drawLayer.draw({
                bbox: this.#h.box,
                root: {
                    viewBox: "0 0 1 1",
                    fill: this.color,
                    "fill-opacity": this.#a
                },
                rootClass: {
                    highlight: !0,
                    free: this.#d
                },
                path: {
                    d: this.#h.toSVGPath()
                }
            }, !1, !0), this.#p = t.drawLayer.drawOutline({
                rootClass: {
                    highlightOutline: !0,
                    free: this.#d
                },
                bbox: this.#n.box,
                path: {
                    d: this.#n.toSVGPath()
                }
            }, this.#d), this.#c && (this.#c.style.clipPath = this.#i));
        }
        static #_([t, e, s, i], n) {
            switch(n){
                case 90:
                    return [
                        1 - e - i,
                        t,
                        i,
                        s
                    ];
                case 180:
                    return [
                        1 - t - s,
                        1 - e - i,
                        s,
                        i
                    ];
                case 270:
                    return [
                        e,
                        1 - t - s,
                        i,
                        s
                    ];
            }
            return [
                t,
                e,
                s,
                i
            ];
        }
        rotate(t) {
            const { drawLayer: e } = this.parent;
            let s;
            this.#d ? (t = (t - this.rotation + 360) % 360, s = Q.#_(this.#h.box, t)) : s = Q.#_([
                this.x,
                this.y,
                this.width,
                this.height
            ], t), e.updateProperties(this.#u, {
                bbox: s,
                root: {
                    "data-main-rotation": t
                }
            }), e.updateProperties(this.#p, {
                bbox: Q.#_(this.#n.box, t),
                root: {
                    "data-main-rotation": t
                }
            });
        }
        render() {
            if (this.div) return this.div;
            const t = super.render();
            this.#m && (t.setAttribute("aria-label", this.#m), t.setAttribute("role", "mark")), this.#d ? t.classList.add("free") : this.div.addEventListener("keydown", this.#P.bind(this), {
                signal: this._uiManager._signal
            });
            const e = this.#c = document.createElement("div");
            t.append(e), e.setAttribute("aria-hidden", "true"), e.className = "internal", e.style.clipPath = this.#i;
            const [s, i] = this.parentDimensions;
            return this.setDims(this.width * s, this.height * i), pe(this, this.#c, [
                "pointerover",
                "pointerleave"
            ]), this.enableEditing(), t;
        }
        pointerover() {
            this.isSelected || this.parent?.drawLayer.updateProperties(this.#p, {
                rootClass: {
                    hovered: !0
                }
            });
        }
        pointerleave() {
            this.isSelected || this.parent?.drawLayer.updateProperties(this.#p, {
                rootClass: {
                    hovered: !1
                }
            });
        }
        #P(t) {
            Q._keyboardManager.exec(this, t);
        }
        _moveCaret(t) {
            switch(this.parent.unselect(this), t){
                case 0:
                case 2:
                    this.#C(!0);
                    break;
                case 1:
                case 3:
                    this.#C(!1);
                    break;
            }
        }
        #C(t) {
            if (!this.#t) return;
            const e = window.getSelection();
            t ? e.setPosition(this.#t, this.#e) : e.setPosition(this.#l, this.#o);
        }
        select() {
            super.select(), this.#p && this.parent?.drawLayer.updateProperties(this.#p, {
                rootClass: {
                    hovered: !1,
                    selected: !0
                }
            });
        }
        unselect() {
            super.unselect(), this.#p && (this.parent?.drawLayer.updateProperties(this.#p, {
                rootClass: {
                    selected: !1
                }
            }), this.#d || this.#C(!1));
        }
        get _mustFixPosition() {
            return !this.#d;
        }
        show(t = this._isVisible) {
            super.show(t), this.parent && (this.parent.drawLayer.updateProperties(this.#u, {
                rootClass: {
                    hidden: !t
                }
            }), this.parent.drawLayer.updateProperties(this.#p, {
                rootClass: {
                    hidden: !t
                }
            }));
        }
        #k() {
            return this.#d ? this.rotation : 0;
        }
        #D() {
            if (this.#d) return null;
            const [t, e] = this.pageDimensions, [s, i] = this.pageTranslation, n = this.#s, r = new Float32Array(n.length * 8);
            let a = 0;
            for (const { x: o, y: l, width: h, height: d } of n){
                const u = o * t + s, f = (1 - l) * e + i;
                r[a] = r[a + 4] = u, r[a + 1] = r[a + 3] = f, r[a + 2] = r[a + 6] = u + h * t, r[a + 5] = r[a + 7] = f - d * e, a += 8;
            }
            return r;
        }
        #N(t) {
            return this.#h.serialize(t, this.#k());
        }
        static startHighlighting(t, e, { target: s, x: i, y: n }) {
            const { x: r, y: a, width: o, height: l } = s.getBoundingClientRect(), h = new AbortController, d = t.combinedSignal(h), u = (f)=>{
                h.abort(), this.#y(t, f);
            };
            window.addEventListener("blur", u, {
                signal: d
            }), window.addEventListener("pointerup", u, {
                signal: d
            }), window.addEventListener("pointerdown", mt, {
                capture: !0,
                passive: !1,
                signal: d
            }), window.addEventListener("contextmenu", _t, {
                signal: d
            }), s.addEventListener("pointermove", this.#E.bind(this, t), {
                signal: d
            }), this._freeHighlight = new $e({
                x: i,
                y: n
            }, [
                r,
                a,
                o,
                l
            ], t.scale, this._defaultThickness / 2, e, .001), { id: this._freeHighlightId, clipPathId: this._freeHighlightClipId } = t.drawLayer.draw({
                bbox: [
                    0,
                    0,
                    1,
                    1
                ],
                root: {
                    viewBox: "0 0 1 1",
                    fill: this._defaultColor,
                    "fill-opacity": this._defaultOpacity
                },
                rootClass: {
                    highlight: !0,
                    free: !0
                },
                path: {
                    d: this._freeHighlight.toSVGPath()
                }
            }, !0, !0);
        }
        static #E(t, e) {
            this._freeHighlight.add(e) && t.drawLayer.updateProperties(this._freeHighlightId, {
                path: {
                    d: this._freeHighlight.toSVGPath()
                }
            });
        }
        static #y(t, e) {
            this._freeHighlight.isEmpty() ? t.drawLayer.remove(this._freeHighlightId) : t.createAndAddNewEditor(e, !1, {
                highlightId: this._freeHighlightId,
                highlightOutlines: this._freeHighlight.getOutlines(),
                clipPathId: this._freeHighlightClipId,
                methodOfCreation: "main_toolbar"
            }), this._freeHighlightId = -1, this._freeHighlight = null, this._freeHighlightClipId = "";
        }
        static async deserialize(t, e, s) {
            let i = null;
            if (t instanceof Ks) {
                const { data: { quadPoints: p, rect: g, rotation: b, id: m, color: A, opacity: y, popupRef: v }, parent: { page: { pageNumber: w } } } = t;
                i = t = {
                    annotationType: F.HIGHLIGHT,
                    color: Array.from(A),
                    opacity: y,
                    quadPoints: p,
                    boxes: null,
                    pageIndex: w - 1,
                    rect: g.slice(0),
                    rotation: b,
                    id: m,
                    deleted: !1,
                    popupRef: v
                };
            } else if (t instanceof Ze) {
                const { data: { inkLists: p, rect: g, rotation: b, id: m, color: A, borderStyle: { rawWidth: y }, popupRef: v }, parent: { page: { pageNumber: w } } } = t;
                i = t = {
                    annotationType: F.HIGHLIGHT,
                    color: Array.from(A),
                    thickness: y,
                    inkLists: p,
                    boxes: null,
                    pageIndex: w - 1,
                    rect: g.slice(0),
                    rotation: b,
                    id: m,
                    deleted: !1,
                    popupRef: v
                };
            }
            const { color: n, quadPoints: r, inkLists: a, opacity: o } = t, l = await super.deserialize(t, e, s);
            l.color = T.makeHexColor(...n), l.#a = o || 1, a && (l.#g = t.thickness), l.annotationElementId = t.id || null, l._initialData = i;
            const [h, d] = l.pageDimensions, [u, f] = l.pageTranslation;
            if (r) {
                const p = l.#s = [];
                for(let g = 0; g < r.length; g += 8)p.push({
                    x: (r[g] - u) / h,
                    y: 1 - (r[g + 1] - f) / d,
                    width: (r[g + 2] - r[g]) / h,
                    height: (r[g + 1] - r[g + 5]) / d
                });
                l.#v(), l.#R(), l.rotate(l.rotation);
            } else if (a) {
                l.#d = !0;
                const p = a[0], g = {
                    x: p[0] - u,
                    y: d - (p[1] - f)
                }, b = new $e(g, [
                    0,
                    0,
                    h,
                    d
                ], 1, l.#g / 2, !0, .001);
                for(let y = 0, v = p.length; y < v; y += 2)g.x = p[y] - u, g.y = d - (p[y + 1] - f), b.add(g);
                const { id: m, clipPathId: A } = e.drawLayer.draw({
                    bbox: [
                        0,
                        0,
                        1,
                        1
                    ],
                    root: {
                        viewBox: "0 0 1 1",
                        fill: l.color,
                        "fill-opacity": l._defaultOpacity
                    },
                    rootClass: {
                        highlight: !0,
                        free: !0
                    },
                    path: {
                        d: b.toSVGPath()
                    }
                }, !0, !0);
                l.#A({
                    highlightOutlines: b.getOutlines(),
                    highlightId: m,
                    clipPathId: A
                }), l.#R();
            }
            return l;
        }
        serialize(t = !1) {
            if (this.isEmpty() || t) return null;
            if (this.deleted) return this.serializeDeleted();
            const e = this.getRect(0, 0), s = I._colorManager.convert(this.color), i = {
                annotationType: F.HIGHLIGHT,
                color: s,
                opacity: this.#a,
                thickness: this.#g,
                quadPoints: this.#D(),
                outlines: this.#N(e),
                pageIndex: this.pageIndex,
                rect: e,
                rotation: this.#k(),
                structTreeParentId: this._structTreeParentId
            };
            return this.annotationElementId && !this.#L(i) ? null : (i.id = this.annotationElementId, i);
        }
        #L(t) {
            const { color: e } = this._initialData;
            return t.color.some((s, i)=>s !== e[i]);
        }
        renderAnnotationElement(t) {
            return t.updateEdited({
                rect: this.getRect(0, 0)
            }), null;
        }
        static canCreateNewEmptyEditor() {
            return !1;
        }
    }
    class or {
        #t = Object.create(null);
        updateProperty(t, e) {
            this[t] = e, this.updateSVGProperty(t, e);
        }
        updateProperties(t) {
            if (t) for (const [e, s] of Object.entries(t))this.updateProperty(e, s);
        }
        updateSVGProperty(t, e) {
            this.#t[t] = e;
        }
        toSVGProperties() {
            const t = this.#t;
            return this.#t = Object.create(null), {
                root: t
            };
        }
        reset() {
            this.#t = Object.create(null);
        }
        updateAll(t = this) {
            this.updateProperties(t);
        }
        clone() {
            V("Not implemented");
        }
    }
    class k extends I {
        #t = null;
        #e;
        _drawId = null;
        static _currentDrawId = -1;
        static _currentParent = null;
        static #s = null;
        static #i = null;
        static #r = null;
        static #n = NaN;
        static #l = null;
        static #o = null;
        static #c = NaN;
        static _INNER_MARGIN = 3;
        constructor(t){
            super(t), this.#e = t.mustBeCommitted || !1, t.drawOutlines && (this.#h(t), this.#f());
        }
        #h({ drawOutlines: t, drawId: e, drawingOptions: s }) {
            this.#t = t, this._drawingOptions ||= s, e >= 0 ? (this._drawId = e, this.parent.drawLayer.finalizeDraw(e, t.defaultProperties)) : this._drawId = this.#u(t, this.parent), this.#m(t.box);
        }
        #u(t, e) {
            const { id: s } = e.drawLayer.draw(k._mergeSVGProperties(this._drawingOptions.toSVGProperties(), t.defaultSVGProperties), !1, !1);
            return s;
        }
        static _mergeSVGProperties(t, e) {
            const s = new Set(Object.keys(t));
            for (const [i, n] of Object.entries(e))s.has(i) ? Object.assign(t[i], n) : t[i] = n;
            return t;
        }
        static getDefaultDrawingOptions(t) {
            V("Not implemented");
        }
        static get typesMap() {
            V("Not implemented");
        }
        static get isDrawer() {
            return !0;
        }
        static get supportMultipleDrawings() {
            return !1;
        }
        static updateDefaultParams(t, e) {
            const s = this.typesMap.get(t);
            s && this._defaultDrawingOptions.updateProperty(s, e), this._currentParent && (k.#s.updateProperty(s, e), this._currentParent.drawLayer.updateProperties(this._currentDrawId, this._defaultDrawingOptions.toSVGProperties()));
        }
        updateParams(t, e) {
            const s = this.constructor.typesMap.get(t);
            s && this._updateProperty(t, s, e);
        }
        static get defaultPropertiesToUpdate() {
            const t = [], e = this._defaultDrawingOptions;
            for (const [s, i] of this.typesMap)t.push([
                s,
                e[i]
            ]);
            return t;
        }
        get propertiesToUpdate() {
            const t = [], { _drawingOptions: e } = this;
            for (const [s, i] of this.constructor.typesMap)t.push([
                s,
                e[i]
            ]);
            return t;
        }
        _updateProperty(t, e, s) {
            const i = this._drawingOptions, n = i[e], r = (a)=>{
                i.updateProperty(e, a);
                const o = this.#t.updateProperty(e, a);
                o && this.#m(o), this.parent?.drawLayer.updateProperties(this._drawId, i.toSVGProperties());
            };
            this.addCommands({
                cmd: r.bind(this, s),
                undo: r.bind(this, n),
                post: this._uiManager.updateUI.bind(this._uiManager, this),
                mustExec: !0,
                type: t,
                overwriteIfSameType: !0,
                keepUndo: !0
            });
        }
        _onResizing() {
            this.parent?.drawLayer.updateProperties(this._drawId, k._mergeSVGProperties(this.#t.getPathResizingSVGProperties(this.#p()), {
                bbox: this.#g()
            }));
        }
        _onResized() {
            this.parent?.drawLayer.updateProperties(this._drawId, k._mergeSVGProperties(this.#t.getPathResizedSVGProperties(this.#p()), {
                bbox: this.#g()
            }));
        }
        _onTranslating(t, e) {
            this.parent?.drawLayer.updateProperties(this._drawId, {
                bbox: this.#g(t, e)
            });
        }
        _onTranslated() {
            this.parent?.drawLayer.updateProperties(this._drawId, k._mergeSVGProperties(this.#t.getPathTranslatedSVGProperties(this.#p(), this.parentDimensions), {
                bbox: this.#g()
            }));
        }
        _onStartDragging() {
            this.parent?.drawLayer.updateProperties(this._drawId, {
                rootClass: {
                    moving: !0
                }
            });
        }
        _onStopDragging() {
            this.parent?.drawLayer.updateProperties(this._drawId, {
                rootClass: {
                    moving: !1
                }
            });
        }
        commit() {
            super.commit(), this.disableEditMode(), this.disableEditing();
        }
        disableEditing() {
            super.disableEditing(), this.div.classList.toggle("disabled", !0);
        }
        enableEditing() {
            super.enableEditing(), this.div.classList.toggle("disabled", !1);
        }
        getBaseTranslation() {
            return [
                0,
                0
            ];
        }
        get isResizable() {
            return !0;
        }
        onceAdded(t) {
            this.annotationElementId || this.parent.addUndoableEditor(this), this._isDraggable = !0, this.#e && (this.#e = !1, this.commit(), this.parent.setSelected(this), t && this.isOnScreen && this.div.focus());
        }
        remove() {
            this.#d(), super.remove();
        }
        rebuild() {
            this.parent && (super.rebuild(), this.div !== null && (this.#f(), this.#m(this.#t.box), this.isAttachedToDOM || this.parent.add(this)));
        }
        setParent(t) {
            let e = !1;
            this.parent && !t ? (this._uiManager.removeShouldRescale(this), this.#d()) : t && (this._uiManager.addShouldRescale(this), this.#f(t), e = !this.parent && this.div?.classList.contains("selectedEditor")), super.setParent(t), e && this.select();
        }
        #d() {
            this._drawId === null || !this.parent || (this.parent.drawLayer.remove(this._drawId), this._drawId = null, this._drawingOptions.reset());
        }
        #f(t = this.parent) {
            if (!(this._drawId !== null && this.parent === t)) {
                if (this._drawId !== null) {
                    this.parent.drawLayer.updateParent(this._drawId, t.drawLayer);
                    return;
                }
                this._drawingOptions.updateAll(), this._drawId = this.#u(this.#t, t);
            }
        }
        #a([t, e, s, i]) {
            const { parentDimensions: [n, r], rotation: a } = this;
            switch(a){
                case 90:
                    return [
                        e,
                        1 - t,
                        s * (r / n),
                        i * (n / r)
                    ];
                case 180:
                    return [
                        1 - t,
                        1 - e,
                        s,
                        i
                    ];
                case 270:
                    return [
                        1 - e,
                        t,
                        s * (r / n),
                        i * (n / r)
                    ];
                default:
                    return [
                        t,
                        e,
                        s,
                        i
                    ];
            }
        }
        #p() {
            const { x: t, y: e, width: s, height: i, parentDimensions: [n, r], rotation: a } = this;
            switch(a){
                case 90:
                    return [
                        1 - e,
                        t,
                        s * (n / r),
                        i * (r / n)
                    ];
                case 180:
                    return [
                        1 - t,
                        1 - e,
                        s,
                        i
                    ];
                case 270:
                    return [
                        e,
                        1 - t,
                        s * (n / r),
                        i * (r / n)
                    ];
                default:
                    return [
                        t,
                        e,
                        s,
                        i
                    ];
            }
        }
        #m(t) {
            if ([this.x, this.y, this.width, this.height] = this.#a(t), this.div) {
                this.fixAndSetPosition();
                const [e, s] = this.parentDimensions;
                this.setDims(this.width * e, this.height * s);
            }
            this._onResized();
        }
        #g() {
            const { x: t, y: e, width: s, height: i, rotation: n, parentRotation: r, parentDimensions: [a, o] } = this;
            switch((n * 4 + r) / 90){
                case 1:
                    return [
                        1 - e - i,
                        t,
                        i,
                        s
                    ];
                case 2:
                    return [
                        1 - t - s,
                        1 - e - i,
                        s,
                        i
                    ];
                case 3:
                    return [
                        e,
                        1 - t - s,
                        i,
                        s
                    ];
                case 4:
                    return [
                        t,
                        e - s * (a / o),
                        i * (o / a),
                        s * (a / o)
                    ];
                case 5:
                    return [
                        1 - e,
                        t,
                        s * (a / o),
                        i * (o / a)
                    ];
                case 6:
                    return [
                        1 - t - i * (o / a),
                        1 - e,
                        i * (o / a),
                        s * (a / o)
                    ];
                case 7:
                    return [
                        e - s * (a / o),
                        1 - t - i * (o / a),
                        s * (a / o),
                        i * (o / a)
                    ];
                case 8:
                    return [
                        t - s,
                        e - i,
                        s,
                        i
                    ];
                case 9:
                    return [
                        1 - e,
                        t - s,
                        i,
                        s
                    ];
                case 10:
                    return [
                        1 - t,
                        1 - e,
                        s,
                        i
                    ];
                case 11:
                    return [
                        e - i,
                        1 - t,
                        i,
                        s
                    ];
                case 12:
                    return [
                        t - i * (o / a),
                        e,
                        i * (o / a),
                        s * (a / o)
                    ];
                case 13:
                    return [
                        1 - e - s * (a / o),
                        t - i * (o / a),
                        s * (a / o),
                        i * (o / a)
                    ];
                case 14:
                    return [
                        1 - t,
                        1 - e - s * (a / o),
                        i * (o / a),
                        s * (a / o)
                    ];
                case 15:
                    return [
                        e,
                        1 - t,
                        s * (a / o),
                        i * (o / a)
                    ];
                default:
                    return [
                        t,
                        e,
                        s,
                        i
                    ];
            }
        }
        rotate() {
            this.parent && this.parent.drawLayer.updateProperties(this._drawId, k._mergeSVGProperties({
                bbox: this.#g()
            }, this.#t.updateRotation((this.parentRotation - this.rotation + 360) % 360)));
        }
        onScaleChanging() {
            this.parent && this.#m(this.#t.updateParentDimensions(this.parentDimensions, this.parent.scale));
        }
        static onScaleChangingWhenDrawing() {}
        render() {
            if (this.div) return this.div;
            const t = super.render();
            t.classList.add("draw");
            const e = document.createElement("div");
            t.append(e), e.setAttribute("aria-hidden", "true"), e.className = "internal";
            const [s, i] = this.parentDimensions;
            return this.setDims(this.width * s, this.height * i), this._uiManager.addShouldRescale(this), this.disableEditing(), t;
        }
        static createDrawerInstance(t, e, s, i, n) {
            V("Not implemented");
        }
        static startDrawing(t, e, s, i) {
            const { target: n, offsetX: r, offsetY: a, pointerId: o, pointerType: l } = i;
            if (k.#l && k.#l !== l) return;
            const { viewport: { rotation: h } } = t, { width: d, height: u } = n.getBoundingClientRect(), f = k.#i = new AbortController, p = t.combinedSignal(f);
            if (k.#n ||= o, k.#l ??= l, window.addEventListener("pointerup", (g)=>{
                k.#n === g.pointerId ? this._endDraw(g) : k.#o?.delete(g.pointerId);
            }, {
                signal: p
            }), window.addEventListener("pointercancel", (g)=>{
                k.#n === g.pointerId ? this._currentParent.endDrawingSession() : k.#o?.delete(g.pointerId);
            }, {
                signal: p
            }), window.addEventListener("pointerdown", (g)=>{
                k.#l === g.pointerType && ((k.#o ||= new Set).add(g.pointerId), k.#s.isCancellable() && (k.#s.removeLastElement(), k.#s.isEmpty() ? this._currentParent.endDrawingSession(!0) : this._endDraw(null)));
            }, {
                capture: !0,
                passive: !1,
                signal: p
            }), window.addEventListener("contextmenu", _t, {
                signal: p
            }), n.addEventListener("pointermove", this._drawMove.bind(this), {
                signal: p
            }), n.addEventListener("touchmove", (g)=>{
                g.timeStamp === k.#c && mt(g);
            }, {
                signal: p
            }), t.toggleDrawing(), e._editorUndoBar?.hide(), k.#s) {
                t.drawLayer.updateProperties(this._currentDrawId, k.#s.startNew(r, a, d, u, h));
                return;
            }
            e.updateUIForDefaultProperties(this), k.#s = this.createDrawerInstance(r, a, d, u, h), k.#r = this.getDefaultDrawingOptions(), this._currentParent = t, { id: this._currentDrawId } = t.drawLayer.draw(this._mergeSVGProperties(k.#r.toSVGProperties(), k.#s.defaultSVGProperties), !0, !1);
        }
        static _drawMove(t) {
            if (k.#c = -1, !k.#s) return;
            const { offsetX: e, offsetY: s, pointerId: i } = t;
            if (k.#n === i) {
                if (k.#o?.size >= 1) {
                    this._endDraw(t);
                    return;
                }
                this._currentParent.drawLayer.updateProperties(this._currentDrawId, k.#s.add(e, s)), k.#c = t.timeStamp, mt(t);
            }
        }
        static _cleanup(t) {
            t && (this._currentDrawId = -1, this._currentParent = null, k.#s = null, k.#r = null, k.#l = null, k.#c = NaN), k.#i && (k.#i.abort(), k.#i = null, k.#n = NaN, k.#o = null);
        }
        static _endDraw(t) {
            const e = this._currentParent;
            if (e) {
                if (e.toggleDrawing(!0), this._cleanup(!1), t && e.drawLayer.updateProperties(this._currentDrawId, k.#s.end(t.offsetX, t.offsetY)), this.supportMultipleDrawings) {
                    const s = k.#s, i = this._currentDrawId, n = s.getLastElement();
                    e.addCommands({
                        cmd: ()=>{
                            e.drawLayer.updateProperties(i, s.setLastElement(n));
                        },
                        undo: ()=>{
                            e.drawLayer.updateProperties(i, s.removeLastElement());
                        },
                        mustExec: !1,
                        type: H.DRAW_STEP
                    });
                    return;
                }
                this.endDrawing(!1);
            }
        }
        static endDrawing(t) {
            const e = this._currentParent;
            if (!e) return null;
            if (e.toggleDrawing(!0), e.cleanUndoStack(H.DRAW_STEP), !k.#s.isEmpty()) {
                const { pageDimensions: [s, i], scale: n } = e, r = e.createAndAddNewEditor({
                    offsetX: 0,
                    offsetY: 0
                }, !1, {
                    drawId: this._currentDrawId,
                    drawOutlines: k.#s.getOutlines(s * n, i * n, n, this._INNER_MARGIN),
                    drawingOptions: k.#r,
                    mustBeCommitted: !t
                });
                return this._cleanup(!0), r;
            }
            return e.drawLayer.remove(this._currentDrawId), this._cleanup(!0), null;
        }
        createDrawingOptions(t) {}
        static deserializeDraw(t, e, s, i, n, r) {
            V("Not implemented");
        }
        static async deserialize(t, e, s) {
            const { rawDims: { pageWidth: i, pageHeight: n, pageX: r, pageY: a } } = e.viewport, o = this.deserializeDraw(r, a, i, n, this._INNER_MARGIN, t), l = await super.deserialize(t, e, s);
            return l.createDrawingOptions(t), l.#h({
                drawOutlines: o
            }), l.#f(), l.onScaleChanging(), l.rotate(), l;
        }
        serializeDraw(t) {
            const [e, s] = this.pageTranslation, [i, n] = this.pageDimensions;
            return this.#t.serialize([
                e,
                s,
                i,
                n
            ], t);
        }
        renderAnnotationElement(t) {
            return t.updateEdited({
                rect: this.getRect(0, 0)
            }), null;
        }
        static canCreateNewEmptyEditor() {
            return !1;
        }
    }
    class lr {
        #t = new Float64Array(6);
        #e;
        #s;
        #i;
        #r;
        #n;
        #l = "";
        #o = 0;
        #c = new Ee;
        #h;
        #u;
        constructor(t, e, s, i, n, r){
            this.#h = s, this.#u = i, this.#i = n, this.#r = r, [t, e] = this.#d(t, e);
            const a = this.#e = [
                NaN,
                NaN,
                NaN,
                NaN,
                t,
                e
            ];
            this.#n = [
                t,
                e
            ], this.#s = [
                {
                    line: a,
                    points: this.#n
                }
            ], this.#t.set(a, 0);
        }
        updateProperty(t, e) {
            t === "stroke-width" && (this.#r = e);
        }
        #d(t, e) {
            return C._normalizePoint(t, e, this.#h, this.#u, this.#i);
        }
        isEmpty() {
            return !this.#s || this.#s.length === 0;
        }
        isCancellable() {
            return this.#n.length <= 10;
        }
        add(t, e) {
            [t, e] = this.#d(t, e);
            const [s, i, n, r] = this.#t.subarray(2, 6), a = t - n, o = e - r;
            return Math.hypot(this.#h * a, this.#u * o) <= 2 ? null : (this.#n.push(t, e), isNaN(s) ? (this.#t.set([
                n,
                r,
                t,
                e
            ], 2), this.#e.push(NaN, NaN, NaN, NaN, t, e), {
                path: {
                    d: this.toSVGPath()
                }
            }) : (isNaN(this.#t[0]) && this.#e.splice(6, 6), this.#t.set([
                s,
                i,
                n,
                r,
                t,
                e
            ], 0), this.#e.push(...C.createBezierPoints(s, i, n, r, t, e)), {
                path: {
                    d: this.toSVGPath()
                }
            }));
        }
        end(t, e) {
            const s = this.add(t, e);
            return s || (this.#n.length === 2 ? {
                path: {
                    d: this.toSVGPath()
                }
            } : null);
        }
        startNew(t, e, s, i, n) {
            this.#h = s, this.#u = i, this.#i = n, [t, e] = this.#d(t, e);
            const r = this.#e = [
                NaN,
                NaN,
                NaN,
                NaN,
                t,
                e
            ];
            this.#n = [
                t,
                e
            ];
            const a = this.#s.at(-1);
            return a && (a.line = new Float32Array(a.line), a.points = new Float32Array(a.points)), this.#s.push({
                line: r,
                points: this.#n
            }), this.#t.set(r, 0), this.#o = 0, this.toSVGPath(), null;
        }
        getLastElement() {
            return this.#s.at(-1);
        }
        setLastElement(t) {
            return this.#s ? (this.#s.push(t), this.#e = t.line, this.#n = t.points, this.#o = 0, {
                path: {
                    d: this.toSVGPath()
                }
            }) : this.#c.setLastElement(t);
        }
        removeLastElement() {
            if (!this.#s) return this.#c.removeLastElement();
            this.#s.pop(), this.#l = "";
            for(let t = 0, e = this.#s.length; t < e; t++){
                const { line: s, points: i } = this.#s[t];
                this.#e = s, this.#n = i, this.#o = 0, this.toSVGPath();
            }
            return {
                path: {
                    d: this.#l
                }
            };
        }
        toSVGPath() {
            const t = C.svgRound(this.#e[4]), e = C.svgRound(this.#e[5]);
            if (this.#n.length === 2) return this.#l = `${this.#l} M ${t} ${e} Z`, this.#l;
            if (this.#n.length <= 6) {
                const i = this.#l.lastIndexOf("M");
                this.#l = `${this.#l.slice(0, i)} M ${t} ${e}`, this.#o = 6;
            }
            if (this.#n.length === 4) {
                const i = C.svgRound(this.#e[10]), n = C.svgRound(this.#e[11]);
                return this.#l = `${this.#l} L ${i} ${n}`, this.#o = 12, this.#l;
            }
            const s = [];
            this.#o === 0 && (s.push(`M ${t} ${e}`), this.#o = 6);
            for(let i = this.#o, n = this.#e.length; i < n; i += 6){
                const [r, a, o, l, h, d] = this.#e.slice(i, i + 6).map(C.svgRound);
                s.push(`C${r} ${a} ${o} ${l} ${h} ${d}`);
            }
            return this.#l += s.join(" "), this.#o = this.#e.length, this.#l;
        }
        getOutlines(t, e, s, i) {
            const n = this.#s.at(-1);
            return n.line = new Float32Array(n.line), n.points = new Float32Array(n.points), this.#c.build(this.#s, t, e, s, this.#i, this.#r, i), this.#t = null, this.#e = null, this.#s = null, this.#l = null, this.#c;
        }
        get defaultSVGProperties() {
            return {
                root: {
                    viewBox: "0 0 10000 10000"
                },
                rootClass: {
                    draw: !0
                },
                bbox: [
                    0,
                    0,
                    1,
                    1
                ]
            };
        }
    }
    class Ee extends C {
        #t;
        #e = 0;
        #s;
        #i;
        #r;
        #n;
        #l;
        #o;
        #c;
        build(t, e, s, i, n, r, a) {
            this.#r = e, this.#n = s, this.#l = i, this.#o = n, this.#c = r, this.#s = a ?? 0, this.#i = t, this.#d();
        }
        setLastElement(t) {
            return this.#i.push(t), {
                path: {
                    d: this.toSVGPath()
                }
            };
        }
        removeLastElement() {
            return this.#i.pop(), {
                path: {
                    d: this.toSVGPath()
                }
            };
        }
        toSVGPath() {
            const t = [];
            for (const { line: e } of this.#i){
                if (t.push(`M${C.svgRound(e[4])} ${C.svgRound(e[5])}`), e.length === 6) {
                    t.push("Z");
                    continue;
                }
                if (e.length === 12) {
                    t.push(`L${C.svgRound(e[10])} ${C.svgRound(e[11])}`);
                    continue;
                }
                for(let s = 6, i = e.length; s < i; s += 6){
                    const [n, r, a, o, l, h] = e.subarray(s, s + 6).map(C.svgRound);
                    t.push(`C${n} ${r} ${a} ${o} ${l} ${h}`);
                }
            }
            return t.join("");
        }
        serialize([t, e, s, i], n) {
            const r = [], a = [], [o, l, h, d] = this.#u();
            let u, f, p, g, b, m, A, y, v;
            switch(this.#o){
                case 0:
                    v = C._rescale, u = t, f = e + i, p = s, g = -i, b = t + o * s, m = e + (1 - l - d) * i, A = t + (o + h) * s, y = e + (1 - l) * i;
                    break;
                case 90:
                    v = C._rescaleAndSwap, u = t, f = e, p = s, g = i, b = t + l * s, m = e + o * i, A = t + (l + d) * s, y = e + (o + h) * i;
                    break;
                case 180:
                    v = C._rescale, u = t + s, f = e, p = -s, g = i, b = t + (1 - o - h) * s, m = e + l * i, A = t + (1 - o) * s, y = e + (l + d) * i;
                    break;
                case 270:
                    v = C._rescaleAndSwap, u = t + s, f = e + i, p = -s, g = -i, b = t + (1 - l - d) * s, m = e + (1 - o - h) * i, A = t + (1 - l) * s, y = e + (1 - o) * i;
                    break;
            }
            for (const { line: w, points: S } of this.#i)r.push(v(w, u, f, p, g, n ? new Array(w.length) : null)), a.push(v(S, u, f, p, g, n ? new Array(S.length) : null));
            return {
                lines: r,
                points: a,
                rect: [
                    b,
                    m,
                    A,
                    y
                ]
            };
        }
        static deserialize(t, e, s, i, n, { paths: { lines: r, points: a }, rotation: o, thickness: l }) {
            const h = [];
            let d, u, f, p, g;
            switch(o){
                case 0:
                    g = C._rescale, d = -t / s, u = e / i + 1, f = 1 / s, p = -1 / i;
                    break;
                case 90:
                    g = C._rescaleAndSwap, d = -e / i, u = -t / s, f = 1 / i, p = 1 / s;
                    break;
                case 180:
                    g = C._rescale, d = t / s + 1, u = -e / i, f = -1 / s, p = 1 / i;
                    break;
                case 270:
                    g = C._rescaleAndSwap, d = e / i + 1, u = t / s + 1, f = -1 / i, p = -1 / s;
                    break;
            }
            if (!r) {
                r = [];
                for (const m of a){
                    const A = m.length;
                    if (A === 2) {
                        r.push(new Float32Array([
                            NaN,
                            NaN,
                            NaN,
                            NaN,
                            m[0],
                            m[1]
                        ]));
                        continue;
                    }
                    if (A === 4) {
                        r.push(new Float32Array([
                            NaN,
                            NaN,
                            NaN,
                            NaN,
                            m[0],
                            m[1],
                            NaN,
                            NaN,
                            NaN,
                            NaN,
                            m[2],
                            m[3]
                        ]));
                        continue;
                    }
                    const y = new Float32Array(3 * (A - 2));
                    r.push(y);
                    let [v, w, S, _] = m.subarray(0, 4);
                    y.set([
                        NaN,
                        NaN,
                        NaN,
                        NaN,
                        v,
                        w
                    ], 0);
                    for(let R = 4; R < A; R += 2){
                        const M = m[R], $ = m[R + 1];
                        y.set(C.createBezierPoints(v, w, S, _, M, $), (R - 2) * 3), [v, w, S, _] = [
                            S,
                            _,
                            M,
                            $
                        ];
                    }
                }
            }
            for(let m = 0, A = r.length; m < A; m++)h.push({
                line: g(r[m].map((y)=>y ?? NaN), d, u, f, p),
                points: g(a[m].map((y)=>y ?? NaN), d, u, f, p)
            });
            const b = new Ee;
            return b.build(h, s, i, 1, o, l, n), b;
        }
        #h(t = this.#c) {
            const e = this.#s + t / 2 * this.#l;
            return this.#o % 180 === 0 ? [
                e / this.#r,
                e / this.#n
            ] : [
                e / this.#n,
                e / this.#r
            ];
        }
        #u() {
            const [t, e, s, i] = this.#t, [n, r] = this.#h(0);
            return [
                t + n,
                e + r,
                s - 2 * n,
                i - 2 * r
            ];
        }
        #d() {
            const t = this.#t = new Float32Array([
                1 / 0,
                1 / 0,
                -1 / 0,
                -1 / 0
            ]);
            for (const { line: i } of this.#i){
                if (i.length <= 12) {
                    for(let a = 4, o = i.length; a < o; a += 6){
                        const [l, h] = i.subarray(a, a + 2);
                        t[0] = Math.min(t[0], l), t[1] = Math.min(t[1], h), t[2] = Math.max(t[2], l), t[3] = Math.max(t[3], h);
                    }
                    continue;
                }
                let n = i[4], r = i[5];
                for(let a = 6, o = i.length; a < o; a += 6){
                    const [l, h, d, u, f, p] = i.subarray(a, a + 6);
                    T.bezierBoundingBox(n, r, l, h, d, u, f, p, t), n = f, r = p;
                }
            }
            const [e, s] = this.#h();
            t[0] = Math.min(1, Math.max(0, t[0] - e)), t[1] = Math.min(1, Math.max(0, t[1] - s)), t[2] = Math.min(1, Math.max(0, t[2] + e)), t[3] = Math.min(1, Math.max(0, t[3] + s)), t[2] -= t[0], t[3] -= t[1];
        }
        get box() {
            return this.#t;
        }
        updateProperty(t, e) {
            return t === "stroke-width" ? this.#f(e) : null;
        }
        #f(t) {
            const [e, s] = this.#h();
            this.#c = t;
            const [i, n] = this.#h(), [r, a] = [
                i - e,
                n - s
            ], o = this.#t;
            return o[0] -= r, o[1] -= a, o[2] += 2 * r, o[3] += 2 * a, o;
        }
        updateParentDimensions([t, e], s) {
            const [i, n] = this.#h();
            this.#r = t, this.#n = e, this.#l = s;
            const [r, a] = this.#h(), o = r - i, l = a - n, h = this.#t;
            return h[0] -= o, h[1] -= l, h[2] += 2 * o, h[3] += 2 * l, h;
        }
        updateRotation(t) {
            return this.#e = t, {
                path: {
                    transform: this.rotationTransform
                }
            };
        }
        get viewBox() {
            return this.#t.map(C.svgRound).join(" ");
        }
        get defaultProperties() {
            const [t, e] = this.#t;
            return {
                root: {
                    viewBox: this.viewBox
                },
                path: {
                    "transform-origin": `${C.svgRound(t)} ${C.svgRound(e)}`
                }
            };
        }
        get rotationTransform() {
            const [, , t, e] = this.#t;
            let s = 0, i = 0, n = 0, r = 0, a = 0, o = 0;
            switch(this.#e){
                case 90:
                    i = e / t, n = -t / e, a = t;
                    break;
                case 180:
                    s = -1, r = -1, a = t, o = e;
                    break;
                case 270:
                    i = -e / t, n = t / e, o = e;
                    break;
                default:
                    return "";
            }
            return `matrix(${s} ${i} ${n} ${r} ${C.svgRound(a)} ${C.svgRound(o)})`;
        }
        getPathResizingSVGProperties([t, e, s, i]) {
            const [n, r] = this.#h(), [a, o, l, h] = this.#t;
            if (Math.abs(l - n) <= C.PRECISION || Math.abs(h - r) <= C.PRECISION) {
                const g = t + s / 2 - (a + l / 2), b = e + i / 2 - (o + h / 2);
                return {
                    path: {
                        "transform-origin": `${C.svgRound(t)} ${C.svgRound(e)}`,
                        transform: `${this.rotationTransform} translate(${g} ${b})`
                    }
                };
            }
            const d = (s - 2 * n) / (l - 2 * n), u = (i - 2 * r) / (h - 2 * r), f = l / s, p = h / i;
            return {
                path: {
                    "transform-origin": `${C.svgRound(a)} ${C.svgRound(o)}`,
                    transform: `${this.rotationTransform} scale(${f} ${p}) translate(${C.svgRound(n)} ${C.svgRound(r)}) scale(${d} ${u}) translate(${C.svgRound(-n)} ${C.svgRound(-r)})`
                }
            };
        }
        getPathResizedSVGProperties([t, e, s, i]) {
            const [n, r] = this.#h(), a = this.#t, [o, l, h, d] = a;
            if (a[0] = t, a[1] = e, a[2] = s, a[3] = i, Math.abs(h - n) <= C.PRECISION || Math.abs(d - r) <= C.PRECISION) {
                const b = t + s / 2 - (o + h / 2), m = e + i / 2 - (l + d / 2);
                for (const { line: A, points: y } of this.#i)C._translate(A, b, m, A), C._translate(y, b, m, y);
                return {
                    root: {
                        viewBox: this.viewBox
                    },
                    path: {
                        "transform-origin": `${C.svgRound(t)} ${C.svgRound(e)}`,
                        transform: this.rotationTransform || null,
                        d: this.toSVGPath()
                    }
                };
            }
            const u = (s - 2 * n) / (h - 2 * n), f = (i - 2 * r) / (d - 2 * r), p = -u * (o + n) + t + n, g = -f * (l + r) + e + r;
            if (u !== 1 || f !== 1 || p !== 0 || g !== 0) for (const { line: b, points: m } of this.#i)C._rescale(b, p, g, u, f, b), C._rescale(m, p, g, u, f, m);
            return {
                root: {
                    viewBox: this.viewBox
                },
                path: {
                    "transform-origin": `${C.svgRound(t)} ${C.svgRound(e)}`,
                    transform: this.rotationTransform || null,
                    d: this.toSVGPath()
                }
            };
        }
        getPathTranslatedSVGProperties([t, e], s) {
            const [i, n] = s, r = this.#t, a = t - r[0], o = e - r[1];
            if (this.#r === i && this.#n === n) for (const { line: l, points: h } of this.#i)C._translate(l, a, o, l), C._translate(h, a, o, h);
            else {
                const l = this.#r / i, h = this.#n / n;
                this.#r = i, this.#n = n;
                for (const { line: d, points: u } of this.#i)C._rescale(d, a, o, l, h, d), C._rescale(u, a, o, l, h, u);
                r[2] *= l, r[3] *= h;
            }
            return r[0] = t, r[1] = e, {
                root: {
                    viewBox: this.viewBox
                },
                path: {
                    d: this.toSVGPath(),
                    "transform-origin": `${C.svgRound(t)} ${C.svgRound(e)}`
                }
            };
        }
        get defaultSVGProperties() {
            const t = this.#t;
            return {
                root: {
                    viewBox: this.viewBox
                },
                rootClass: {
                    draw: !0
                },
                path: {
                    d: this.toSVGPath(),
                    "transform-origin": `${C.svgRound(t[0])} ${C.svgRound(t[1])}`,
                    transform: this.rotationTransform || null
                },
                bbox: t
            };
        }
    }
    class ts extends or {
        #t;
        constructor(t){
            super(), this.#t = t, super.updateProperties({
                fill: "none",
                stroke: I._defaultLineColor,
                "stroke-opacity": 1,
                "stroke-width": 1,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "stroke-miterlimit": 10
            });
        }
        updateSVGProperty(t, e) {
            t === "stroke-width" && (e ??= this["stroke-width"], e *= this.#t.realScale), super.updateSVGProperty(t, e);
        }
        clone() {
            const t = new ts(this.#t);
            return t.updateAll(this), t;
        }
    }
    class es extends k {
        static _type = "ink";
        static _editorType = F.INK;
        static _defaultDrawingOptions = null;
        constructor(t){
            super({
                ...t,
                name: "inkEditor"
            }), this._willKeepAspectRatio = !0;
        }
        static initialize(t, e) {
            I.initialize(t, e), this._defaultDrawingOptions = new ts(e.viewParameters);
        }
        static getDefaultDrawingOptions(t) {
            const e = this._defaultDrawingOptions.clone();
            return e.updateProperties(t), e;
        }
        static get supportMultipleDrawings() {
            return !0;
        }
        static get typesMap() {
            return O(this, "typesMap", new Map([
                [
                    H.INK_THICKNESS,
                    "stroke-width"
                ],
                [
                    H.INK_COLOR,
                    "stroke"
                ],
                [
                    H.INK_OPACITY,
                    "stroke-opacity"
                ]
            ]));
        }
        static createDrawerInstance(t, e, s, i, n) {
            return new lr(t, e, s, i, n, this._defaultDrawingOptions["stroke-width"]);
        }
        static deserializeDraw(t, e, s, i, n, r) {
            return Ee.deserialize(t, e, s, i, n, r);
        }
        static async deserialize(t, e, s) {
            let i = null;
            if (t instanceof Ze) {
                const { data: { inkLists: r, rect: a, rotation: o, id: l, color: h, opacity: d, borderStyle: { rawWidth: u }, popupRef: f }, parent: { page: { pageNumber: p } } } = t;
                i = t = {
                    annotationType: F.INK,
                    color: Array.from(h),
                    thickness: u,
                    opacity: d,
                    paths: {
                        points: r
                    },
                    boxes: null,
                    pageIndex: p - 1,
                    rect: a.slice(0),
                    rotation: o,
                    id: l,
                    deleted: !1,
                    popupRef: f
                };
            }
            const n = await super.deserialize(t, e, s);
            return n.annotationElementId = t.id || null, n._initialData = i, n;
        }
        onScaleChanging() {
            if (!this.parent) return;
            super.onScaleChanging();
            const { _drawId: t, _drawingOptions: e, parent: s } = this;
            e.updateSVGProperty("stroke-width"), s.drawLayer.updateProperties(t, e.toSVGProperties());
        }
        static onScaleChangingWhenDrawing() {
            const t = this._currentParent;
            t && (super.onScaleChangingWhenDrawing(), this._defaultDrawingOptions.updateSVGProperty("stroke-width"), t.drawLayer.updateProperties(this._currentDrawId, this._defaultDrawingOptions.toSVGProperties()));
        }
        createDrawingOptions({ color: t, thickness: e, opacity: s }) {
            this._drawingOptions = es.getDefaultDrawingOptions({
                stroke: T.makeHexColor(...t),
                "stroke-width": e,
                "stroke-opacity": s
            });
        }
        serialize(t = !1) {
            if (this.isEmpty()) return null;
            if (this.deleted) return this.serializeDeleted();
            const { lines: e, points: s, rect: i } = this.serializeDraw(t), { _drawingOptions: { stroke: n, "stroke-opacity": r, "stroke-width": a } } = this, o = {
                annotationType: F.INK,
                color: I._colorManager.convert(n),
                opacity: r,
                thickness: a,
                paths: {
                    lines: e,
                    points: s
                },
                pageIndex: this.pageIndex,
                rect: i,
                rotation: this.rotation,
                structTreeParentId: this._structTreeParentId
            };
            return t ? o : this.annotationElementId && !this.#t(o) ? null : (o.id = this.annotationElementId, o);
        }
        #t(t) {
            const { color: e, thickness: s, opacity: i, pageIndex: n } = this._initialData;
            return this._hasBeenMoved || this._hasBeenResized || t.color.some((r, a)=>r !== e[a]) || t.thickness !== s || t.opacity !== i || t.pageIndex !== n;
        }
        renderAnnotationElement(t) {
            const { points: e, rect: s } = this.serializeDraw(!1);
            return t.updateEdited({
                rect: s,
                thickness: this._drawingOptions["stroke-width"],
                points: e
            }), null;
        }
    }
    class ss extends I {
        #t = null;
        #e = null;
        #s = null;
        #i = null;
        #r = null;
        #n = "";
        #l = null;
        #o = null;
        #c = !1;
        #h = !1;
        static _type = "stamp";
        static _editorType = F.STAMP;
        constructor(t){
            super({
                ...t,
                name: "stampEditor"
            }), this.#i = t.bitmapUrl, this.#r = t.bitmapFile;
        }
        static initialize(t, e) {
            I.initialize(t, e);
        }
        static get supportedTypes() {
            return O(this, "supportedTypes", [
                "apng",
                "avif",
                "bmp",
                "gif",
                "jpeg",
                "png",
                "svg+xml",
                "webp",
                "x-icon"
            ].map((e)=>`image/${e}`));
        }
        static get supportedTypesStr() {
            return O(this, "supportedTypesStr", this.supportedTypes.join(","));
        }
        static isHandlingMimeForPasting(t) {
            return this.supportedTypes.includes(t);
        }
        static paste(t, e) {
            e.pasteEditor(F.STAMP, {
                bitmapFile: t.getAsFile()
            });
        }
        altTextFinish() {
            this._uiManager.useNewAltTextFlow && (this.div.hidden = !1), super.altTextFinish();
        }
        get telemetryFinalData() {
            return {
                type: "stamp",
                hasAltText: !!this.altTextData?.altText
            };
        }
        static computeTelemetryFinalData(t) {
            const e = t.get("hasAltText");
            return {
                hasAltText: e.get(!0) ?? 0,
                hasNoAltText: e.get(!1) ?? 0
            };
        }
        #u(t, e = !1) {
            if (!t) {
                this.remove();
                return;
            }
            this.#t = t.bitmap, e || (this.#e = t.id, this.#c = t.isSvg), t.file && (this.#n = t.file.name), this.#a();
        }
        #d() {
            if (this.#s = null, this._uiManager.enableWaiting(!1), !!this.#l) {
                if (this._uiManager.useNewAltTextWhenAddingImage && this._uiManager.useNewAltTextFlow && this.#t) {
                    this._editToolbar.hide(), this._uiManager.editAltText(this, !0);
                    return;
                }
                if (!this._uiManager.useNewAltTextWhenAddingImage && this._uiManager.useNewAltTextFlow && this.#t) {
                    this._reportTelemetry({
                        action: "pdfjs.image.image_added",
                        data: {
                            alt_text_modal: !1,
                            alt_text_type: "empty"
                        }
                    });
                    try {
                        this.mlGuessAltText();
                    } catch  {}
                }
                this.div.focus();
            }
        }
        async mlGuessAltText(t = null, e = !0) {
            if (this.hasAltTextData()) return null;
            const { mlManager: s } = this._uiManager;
            if (!s) throw new Error("No ML.");
            if (!await s.isEnabledFor("altText")) throw new Error("ML isn't enabled for alt text.");
            const { data: i, width: n, height: r } = t || this.copyCanvas(null, null, !0).imageData, a = await s.guess({
                name: "altText",
                request: {
                    data: i,
                    width: n,
                    height: r,
                    channels: i.length / (n * r)
                }
            });
            if (!a) throw new Error("No response from the AI service.");
            if (a.error) throw new Error("Error from the AI service.");
            if (a.cancel) return null;
            if (!a.output) throw new Error("No valid response from the AI service.");
            const o = a.output;
            return await this.setGuessedAltText(o), e && !this.hasAltTextData() && (this.altTextData = {
                alt: o,
                decorative: !1
            }), o;
        }
        #f() {
            if (this.#e) {
                this._uiManager.enableWaiting(!0), this._uiManager.imageManager.getFromId(this.#e).then((s)=>this.#u(s, !0)).finally(()=>this.#d());
                return;
            }
            if (this.#i) {
                const s = this.#i;
                this.#i = null, this._uiManager.enableWaiting(!0), this.#s = this._uiManager.imageManager.getFromUrl(s).then((i)=>this.#u(i)).finally(()=>this.#d());
                return;
            }
            if (this.#r) {
                const s = this.#r;
                this.#r = null, this._uiManager.enableWaiting(!0), this.#s = this._uiManager.imageManager.getFromFile(s).then((i)=>this.#u(i)).finally(()=>this.#d());
                return;
            }
            const t = document.createElement("input");
            t.type = "file", t.accept = ss.supportedTypesStr;
            const e = this._uiManager._signal;
            this.#s = new Promise((s)=>{
                t.addEventListener("change", async ()=>{
                    if (!t.files || t.files.length === 0) this.remove();
                    else {
                        this._uiManager.enableWaiting(!0);
                        const i = await this._uiManager.imageManager.getFromFile(t.files[0]);
                        this._reportTelemetry({
                            action: "pdfjs.image.image_selected",
                            data: {
                                alt_text_modal: this._uiManager.useNewAltTextFlow
                            }
                        }), this.#u(i);
                    }
                    s();
                }, {
                    signal: e
                }), t.addEventListener("cancel", ()=>{
                    this.remove(), s();
                }, {
                    signal: e
                });
            }).finally(()=>this.#d()), t.click();
        }
        remove() {
            this.#e && (this.#t = null, this._uiManager.imageManager.deleteId(this.#e), this.#l?.remove(), this.#l = null, this.#o && (clearTimeout(this.#o), this.#o = null)), super.remove();
        }
        rebuild() {
            if (!this.parent) {
                this.#e && this.#f();
                return;
            }
            super.rebuild(), this.div !== null && (this.#e && this.#l === null && this.#f(), this.isAttachedToDOM || this.parent.add(this));
        }
        onceAdded(t) {
            this._isDraggable = !0, t && this.div.focus();
        }
        isEmpty() {
            return !(this.#s || this.#t || this.#i || this.#r || this.#e);
        }
        get isResizable() {
            return !0;
        }
        render() {
            if (this.div) return this.div;
            let t, e;
            if (this.width && (t = this.x, e = this.y), super.render(), this.div.hidden = !0, this.div.setAttribute("role", "figure"), this.addAltTextButton(), this.#t ? this.#a() : this.#f(), this.width && !this.annotationElementId) {
                const [s, i] = this.parentDimensions;
                this.setAt(t * s, e * i, this.width * s, this.height * i);
            }
            return this._uiManager.addShouldRescale(this), this.div;
        }
        _onResized() {
            this.onScaleChanging();
        }
        onScaleChanging() {
            if (!this.parent) return;
            this.#o !== null && clearTimeout(this.#o);
            const t = 200;
            this.#o = setTimeout(()=>{
                this.#o = null, this.#m();
            }, t);
        }
        #a() {
            const { div: t } = this;
            let { width: e, height: s } = this.#t;
            const [i, n] = this.pageDimensions, r = .75;
            if (this.width) e = this.width * i, s = this.height * n;
            else if (e > r * i || s > r * n) {
                const h = Math.min(r * i / e, r * n / s);
                e *= h, s *= h;
            }
            const [a, o] = this.parentDimensions;
            this.setDims(e * a / i, s * o / n), this._uiManager.enableWaiting(!1);
            const l = this.#l = document.createElement("canvas");
            l.setAttribute("role", "img"), this.addContainer(l), this.width = e / i, this.height = s / n, this._initialOptions?.isCentered ? this.center() : this.fixAndSetPosition(), this._initialOptions = null, (!this._uiManager.useNewAltTextWhenAddingImage || !this._uiManager.useNewAltTextFlow || this.annotationElementId) && (t.hidden = !1), this.#m(), this.#h || (this.parent.addUndoableEditor(this), this.#h = !0), this._reportTelemetry({
                action: "inserted_image"
            }), this.#n && l.setAttribute("aria-label", this.#n);
        }
        copyCanvas(t, e, s = !1) {
            t || (t = 224);
            const { width: i, height: n } = this.#t, r = new Fe;
            let a = this.#t, o = i, l = n, h = null;
            if (e) {
                if (i > e || n > e) {
                    const S = Math.min(e / i, e / n);
                    o = Math.floor(i * S), l = Math.floor(n * S);
                }
                h = document.createElement("canvas");
                const u = h.width = Math.ceil(o * r.sx), f = h.height = Math.ceil(l * r.sy);
                this.#c || (a = this.#p(u, f));
                const p = h.getContext("2d");
                p.filter = this._uiManager.hcmFilter;
                let g = "white", b = "#cfcfd8";
                this._uiManager.hcmFilter !== "none" ? b = "black" : window.matchMedia?.("(prefers-color-scheme: dark)").matches && (g = "#8f8f9d", b = "#42414d");
                const m = 15, A = m * r.sx, y = m * r.sy, v = new OffscreenCanvas(A * 2, y * 2), w = v.getContext("2d");
                w.fillStyle = g, w.fillRect(0, 0, A * 2, y * 2), w.fillStyle = b, w.fillRect(0, 0, A, y), w.fillRect(A, y, A, y), p.fillStyle = p.createPattern(v, "repeat"), p.fillRect(0, 0, u, f), p.drawImage(a, 0, 0, a.width, a.height, 0, 0, u, f);
            }
            let d = null;
            if (s) {
                let u, f;
                if (r.symmetric && a.width < t && a.height < t) u = a.width, f = a.height;
                else if (a = this.#t, i > t || n > t) {
                    const b = Math.min(t / i, t / n);
                    u = Math.floor(i * b), f = Math.floor(n * b), this.#c || (a = this.#p(u, f));
                }
                const g = new OffscreenCanvas(u, f).getContext("2d", {
                    willReadFrequently: !0
                });
                g.drawImage(a, 0, 0, a.width, a.height, 0, 0, u, f), d = {
                    width: u,
                    height: f,
                    data: g.getImageData(0, 0, u, f).data
                };
            }
            return {
                canvas: h,
                width: o,
                height: l,
                imageData: d
            };
        }
        #p(t, e) {
            const { width: s, height: i } = this.#t;
            let n = s, r = i, a = this.#t;
            for(; n > 2 * t || r > 2 * e;){
                const o = n, l = r;
                n > 2 * t && (n = n >= 16384 ? Math.floor(n / 2) - 1 : Math.ceil(n / 2)), r > 2 * e && (r = r >= 16384 ? Math.floor(r / 2) - 1 : Math.ceil(r / 2));
                const h = new OffscreenCanvas(n, r);
                h.getContext("2d").drawImage(a, 0, 0, o, l, 0, 0, n, r), a = h.transferToImageBitmap();
            }
            return a;
        }
        #m() {
            const [t, e] = this.parentDimensions, { width: s, height: i } = this, n = new Fe, r = Math.ceil(s * t * n.sx), a = Math.ceil(i * e * n.sy), o = this.#l;
            if (!o || o.width === r && o.height === a) return;
            o.width = r, o.height = a;
            const l = this.#c ? this.#t : this.#p(r, a), h = o.getContext("2d");
            h.filter = this._uiManager.hcmFilter, h.drawImage(l, 0, 0, l.width, l.height, 0, 0, r, a);
        }
        getImageForAltText() {
            return this.#l;
        }
        #g(t) {
            if (t) {
                if (this.#c) {
                    const i = this._uiManager.imageManager.getSvgUrl(this.#e);
                    if (i) return i;
                }
                const e = document.createElement("canvas");
                return { width: e.width, height: e.height } = this.#t, e.getContext("2d").drawImage(this.#t, 0, 0), e.toDataURL();
            }
            if (this.#c) {
                const [e, s] = this.pageDimensions, i = Math.round(this.width * e * Vt.PDF_TO_CSS_UNITS), n = Math.round(this.height * s * Vt.PDF_TO_CSS_UNITS), r = new OffscreenCanvas(i, n);
                return r.getContext("2d").drawImage(this.#t, 0, 0, this.#t.width, this.#t.height, 0, 0, i, n), r.transferToImageBitmap();
            }
            return structuredClone(this.#t);
        }
        static async deserialize(t, e, s) {
            let i = null;
            if (t instanceof Qs) {
                const { data: { rect: p, rotation: g, id: b, structParent: m, popupRef: A }, container: y, parent: { page: { pageNumber: v } } } = t, w = y.querySelector("canvas"), S = s.imageManager.getFromCanvas(y.id, w);
                w.remove();
                const _ = (await e._structTree.getAriaAttributes(`${Ge}${b}`))?.get("aria-label") || "";
                i = t = {
                    annotationType: F.STAMP,
                    bitmapId: S.id,
                    bitmap: S.bitmap,
                    pageIndex: v - 1,
                    rect: p.slice(0),
                    rotation: g,
                    id: b,
                    deleted: !1,
                    accessibilityData: {
                        decorative: !1,
                        altText: _
                    },
                    isSvg: !1,
                    structParent: m,
                    popupRef: A
                };
            }
            const n = await super.deserialize(t, e, s), { rect: r, bitmap: a, bitmapUrl: o, bitmapId: l, isSvg: h, accessibilityData: d } = t;
            l && s.imageManager.isValidId(l) ? (n.#e = l, a && (n.#t = a)) : n.#i = o, n.#c = h;
            const [u, f] = n.pageDimensions;
            return n.width = (r[2] - r[0]) / u, n.height = (r[3] - r[1]) / f, n.annotationElementId = t.id || null, d && (n.altTextData = d), n._initialData = i, n.#h = !!i, n;
        }
        serialize(t = !1, e = null) {
            if (this.isEmpty()) return null;
            if (this.deleted) return this.serializeDeleted();
            const s = {
                annotationType: F.STAMP,
                bitmapId: this.#e,
                pageIndex: this.pageIndex,
                rect: this.getRect(0, 0),
                rotation: this.rotation,
                isSvg: this.#c,
                structTreeParentId: this._structTreeParentId
            };
            if (t) return s.bitmapUrl = this.#g(!0), s.accessibilityData = this.serializeAltText(!0), s;
            const { decorative: i, altText: n } = this.serializeAltText(!1);
            if (!i && n && (s.accessibilityData = {
                type: "Figure",
                alt: n
            }), this.annotationElementId) {
                const a = this.#b(s);
                if (a.isSame) return null;
                a.isSameAltText ? delete s.accessibilityData : s.accessibilityData.structParent = this._initialData.structParent ?? -1;
            }
            if (s.id = this.annotationElementId, e === null) return s;
            e.stamps ||= new Map;
            const r = this.#c ? (s.rect[2] - s.rect[0]) * (s.rect[3] - s.rect[1]) : null;
            if (!e.stamps.has(this.#e)) e.stamps.set(this.#e, {
                area: r,
                serialized: s
            }), s.bitmap = this.#g(!1);
            else if (this.#c) {
                const a = e.stamps.get(this.#e);
                r > a.area && (a.area = r, a.serialized.bitmap.close(), a.serialized.bitmap = this.#g(!1));
            }
            return s;
        }
        #b(t) {
            const { pageIndex: e, accessibilityData: { altText: s } } = this._initialData, i = t.pageIndex === e, n = (t.accessibilityData?.alt || "") === s;
            return {
                isSame: !this._hasBeenMoved && !this._hasBeenResized && i && n,
                isSameAltText: n
            };
        }
        renderAnnotationElement(t) {
            return t.updateEdited({
                rect: this.getRect(0, 0)
            }), null;
        }
    }
    class Rt {
        #t;
        #e = !1;
        #s = null;
        #i = null;
        #r = null;
        #n = new Map;
        #l = !1;
        #o = !1;
        #c = !1;
        #h = null;
        #u = null;
        #d = null;
        #f = null;
        #a;
        static _initialized = !1;
        static #p = new Map([
            it,
            es,
            ss,
            Q
        ].map((t)=>[
                t._editorType,
                t
            ]));
        constructor({ uiManager: t, pageIndex: e, div: s, structTreeLayer: i, accessibilityManager: n, annotationLayer: r, drawLayer: a, textLayer: o, viewport: l, l10n: h }){
            const d = [
                ...Rt.#p.values()
            ];
            if (!Rt._initialized) {
                Rt._initialized = !0;
                for (const u of d)u.initialize(h, t);
            }
            t.registerEditorTypes(d), this.#a = t, this.pageIndex = e, this.div = s, this.#t = n, this.#s = r, this.viewport = l, this.#d = o, this.drawLayer = a, this._structTree = i, this.#a.addLayer(this);
        }
        get isEmpty() {
            return this.#n.size === 0;
        }
        get isInvisible() {
            return this.isEmpty && this.#a.getMode() === F.NONE;
        }
        updateToolbar(t) {
            this.#a.updateToolbar(t);
        }
        updateMode(t = this.#a.getMode()) {
            switch(this.#A(), t){
                case F.NONE:
                    this.disableTextSelection(), this.togglePointerEvents(!1), this.toggleAnnotationLayerPointerEvents(!0), this.disableClick();
                    return;
                case F.INK:
                    this.disableTextSelection(), this.togglePointerEvents(!0), this.enableClick();
                    break;
                case F.HIGHLIGHT:
                    this.enableTextSelection(), this.togglePointerEvents(!1), this.disableClick();
                    break;
                default:
                    this.disableTextSelection(), this.togglePointerEvents(!0), this.enableClick();
            }
            this.toggleAnnotationLayerPointerEvents(!1);
            const { classList: e } = this.div;
            for (const s of Rt.#p.values())e.toggle(`${s._type}Editing`, t === s._editorType);
            this.div.hidden = !1;
        }
        hasTextLayer(t) {
            return t === this.#d?.div;
        }
        setEditingState(t) {
            this.#a.setEditingState(t);
        }
        addCommands(t) {
            this.#a.addCommands(t);
        }
        cleanUndoStack(t) {
            this.#a.cleanUndoStack(t);
        }
        toggleDrawing(t = !1) {
            this.div.classList.toggle("drawing", !t);
        }
        togglePointerEvents(t = !1) {
            this.div.classList.toggle("disabled", !t);
        }
        toggleAnnotationLayerPointerEvents(t = !1) {
            this.#s?.div.classList.toggle("disabled", !t);
        }
        async enable() {
            this.#c = !0, this.div.tabIndex = 0, this.togglePointerEvents(!0);
            const t = new Set;
            for (const s of this.#n.values())s.enableEditing(), s.show(!0), s.annotationElementId && (this.#a.removeChangedExistingAnnotation(s), t.add(s.annotationElementId));
            if (!this.#s) {
                this.#c = !1;
                return;
            }
            const e = this.#s.getEditableAnnotations();
            for (const s of e){
                if (s.hide(), this.#a.isDeletedAnnotationElement(s.data.id) || t.has(s.data.id)) continue;
                const i = await this.deserialize(s);
                i && (this.addOrRebuild(i), i.enableEditing());
            }
            this.#c = !1;
        }
        disable() {
            this.#o = !0, this.div.tabIndex = -1, this.togglePointerEvents(!1);
            const t = new Map, e = new Map;
            for (const i of this.#n.values())if (i.disableEditing(), !!i.annotationElementId) {
                if (i.serialize() !== null) {
                    t.set(i.annotationElementId, i);
                    continue;
                } else e.set(i.annotationElementId, i);
                this.getEditableAnnotation(i.annotationElementId)?.show(), i.remove();
            }
            if (this.#s) {
                const i = this.#s.getEditableAnnotations();
                for (const n of i){
                    const { id: r } = n.data;
                    if (this.#a.isDeletedAnnotationElement(r)) continue;
                    let a = e.get(r);
                    if (a) {
                        a.resetAnnotationElement(n), a.show(!1), n.show();
                        continue;
                    }
                    a = t.get(r), a && (this.#a.addChangedExistingAnnotation(a), a.renderAnnotationElement(n) && a.show(!1)), n.show();
                }
            }
            this.#A(), this.isEmpty && (this.div.hidden = !0);
            const { classList: s } = this.div;
            for (const i of Rt.#p.values())s.remove(`${i._type}Editing`);
            this.disableTextSelection(), this.toggleAnnotationLayerPointerEvents(!0), this.#o = !1;
        }
        getEditableAnnotation(t) {
            return this.#s?.getEditableAnnotation(t) || null;
        }
        setActiveEditor(t) {
            this.#a.getActive() !== t && this.#a.setActiveEditor(t);
        }
        enableTextSelection() {
            if (this.div.tabIndex = -1, this.#d?.div && !this.#f) {
                this.#f = new AbortController;
                const t = this.#a.combinedSignal(this.#f);
                this.#d.div.addEventListener("pointerdown", this.#m.bind(this), {
                    signal: t
                }), this.#d.div.classList.add("highlighting");
            }
        }
        disableTextSelection() {
            this.div.tabIndex = 0, this.#d?.div && this.#f && (this.#f.abort(), this.#f = null, this.#d.div.classList.remove("highlighting"));
        }
        #m(t) {
            this.#a.unselectAll();
            const { target: e } = t;
            if (e === this.#d.div || (e.getAttribute("role") === "img" || e.classList.contains("endOfContent")) && this.#d.div.contains(e)) {
                const { isMac: s } = dt.platform;
                if (t.button !== 0 || t.ctrlKey && s) return;
                this.#a.showAllEditors("highlight", !0, !0), this.#d.div.classList.add("free"), this.toggleDrawing(), Q.startHighlighting(this, this.#a.direction === "ltr", {
                    target: this.#d.div,
                    x: t.x,
                    y: t.y
                }), this.#d.div.addEventListener("pointerup", ()=>{
                    this.#d.div.classList.remove("free"), this.toggleDrawing(!0);
                }, {
                    once: !0,
                    signal: this.#a._signal
                }), t.preventDefault();
            }
        }
        enableClick() {
            if (this.#i) return;
            this.#i = new AbortController;
            const t = this.#a.combinedSignal(this.#i);
            this.div.addEventListener("pointerdown", this.pointerdown.bind(this), {
                signal: t
            });
            const e = this.pointerup.bind(this);
            this.div.addEventListener("pointerup", e, {
                signal: t
            }), this.div.addEventListener("pointercancel", e, {
                signal: t
            });
        }
        disableClick() {
            this.#i?.abort(), this.#i = null;
        }
        attach(t) {
            this.#n.set(t.id, t);
            const { annotationElementId: e } = t;
            e && this.#a.isDeletedAnnotationElement(e) && this.#a.removeDeletedAnnotationElement(t);
        }
        detach(t) {
            this.#n.delete(t.id), this.#t?.removePointerInTextLayer(t.contentDiv), !this.#o && t.annotationElementId && this.#a.addDeletedAnnotationElement(t);
        }
        remove(t) {
            this.detach(t), this.#a.removeEditor(t), t.div.remove(), t.isAttachedToDOM = !1;
        }
        changeParent(t) {
            t.parent !== this && (t.parent && t.annotationElementId && (this.#a.addDeletedAnnotationElement(t.annotationElementId), I.deleteAnnotationElement(t), t.annotationElementId = null), this.attach(t), t.parent?.detach(t), t.setParent(this), t.div && t.isAttachedToDOM && (t.div.remove(), this.div.append(t.div)));
        }
        add(t) {
            if (!(t.parent === this && t.isAttachedToDOM)) {
                if (this.changeParent(t), this.#a.addEditor(t), this.attach(t), !t.isAttachedToDOM) {
                    const e = t.render();
                    this.div.append(e), t.isAttachedToDOM = !0;
                }
                t.fixAndSetPosition(), t.onceAdded(!this.#c), this.#a.addToAnnotationStorage(t), t._reportTelemetry(t.telemetryInitialData);
            }
        }
        moveEditorInDOM(t) {
            if (!t.isAttachedToDOM) return;
            const { activeElement: e } = document;
            t.div.contains(e) && !this.#r && (t._focusEventsAllowed = !1, this.#r = setTimeout(()=>{
                this.#r = null, t.div.contains(document.activeElement) ? t._focusEventsAllowed = !0 : (t.div.addEventListener("focusin", ()=>{
                    t._focusEventsAllowed = !0;
                }, {
                    once: !0,
                    signal: this.#a._signal
                }), e.focus());
            }, 0)), t._structTreeParentId = this.#t?.moveElementInDOM(this.div, t.div, t.contentDiv, !0);
        }
        addOrRebuild(t) {
            t.needsToBeRebuilt() ? (t.parent ||= this, t.rebuild(), t.show()) : this.add(t);
        }
        addUndoableEditor(t) {
            const e = ()=>t._uiManager.rebuild(t), s = ()=>{
                t.remove();
            };
            this.addCommands({
                cmd: e,
                undo: s,
                mustExec: !1
            });
        }
        getNextId() {
            return this.#a.getId();
        }
        get #g() {
            return Rt.#p.get(this.#a.getMode());
        }
        combinedSignal(t) {
            return this.#a.combinedSignal(t);
        }
        #b(t) {
            const e = this.#g;
            return e ? new e.prototype.constructor(t) : null;
        }
        canCreateNewEmptyEditor() {
            return this.#g?.canCreateNewEmptyEditor();
        }
        pasteEditor(t, e) {
            this.#a.updateToolbar(t), this.#a.updateMode(t);
            const { offsetX: s, offsetY: i } = this.#v(), n = this.getNextId(), r = this.#b({
                parent: this,
                id: n,
                x: s,
                y: i,
                uiManager: this.#a,
                isCentered: !0,
                ...e
            });
            r && this.add(r);
        }
        async deserialize(t) {
            return await Rt.#p.get(t.annotationType ?? t.annotationEditorType)?.deserialize(t, this, this.#a) || null;
        }
        createAndAddNewEditor(t, e, s = {}) {
            const i = this.getNextId(), n = this.#b({
                parent: this,
                id: i,
                x: t.offsetX,
                y: t.offsetY,
                uiManager: this.#a,
                isCentered: e,
                ...s
            });
            return n && this.add(n), n;
        }
        #v() {
            const { x: t, y: e, width: s, height: i } = this.div.getBoundingClientRect(), n = Math.max(0, t), r = Math.max(0, e), a = Math.min(window.innerWidth, t + s), o = Math.min(window.innerHeight, e + i), l = (n + a) / 2 - t, h = (r + o) / 2 - e, [d, u] = this.viewport.rotation % 180 === 0 ? [
                l,
                h
            ] : [
                h,
                l
            ];
            return {
                offsetX: d,
                offsetY: u
            };
        }
        addNewEditor() {
            this.createAndAddNewEditor(this.#v(), !0);
        }
        setSelected(t) {
            this.#a.setSelected(t);
        }
        toggleSelected(t) {
            this.#a.toggleSelected(t);
        }
        unselect(t) {
            this.#a.unselect(t);
        }
        pointerup(t) {
            const { isMac: e } = dt.platform;
            if (!(t.button !== 0 || t.ctrlKey && e) && t.target === this.div && this.#l && (this.#l = !1, !(this.#g?.isDrawer && this.#g.supportMultipleDrawings))) {
                if (!this.#e) {
                    this.#e = !0;
                    return;
                }
                if (this.#a.getMode() === F.STAMP) {
                    this.#a.unselectAll();
                    return;
                }
                this.createAndAddNewEditor(t, !1);
            }
        }
        pointerdown(t) {
            if (this.#a.getMode() === F.HIGHLIGHT && this.enableTextSelection(), this.#l) {
                this.#l = !1;
                return;
            }
            const { isMac: e } = dt.platform;
            if (t.button !== 0 || t.ctrlKey && e || t.target !== this.div) return;
            if (this.#l = !0, this.#g?.isDrawer) {
                this.startDrawingSession(t);
                return;
            }
            const s = this.#a.getActive();
            this.#e = !s || s.isEmpty();
        }
        startDrawingSession(t) {
            if (this.div.focus(), this.#h) {
                this.#g.startDrawing(this, this.#a, !1, t);
                return;
            }
            this.#a.setCurrentDrawingSession(this), this.#h = new AbortController;
            const e = this.#a.combinedSignal(this.#h);
            this.div.addEventListener("blur", ({ relatedTarget: s })=>{
                s && !this.div.contains(s) && (this.#u = null, this.commitOrRemove());
            }, {
                signal: e
            }), this.#g.startDrawing(this, this.#a, !1, t);
        }
        pause(t) {
            if (t) {
                const { activeElement: e } = document;
                this.div.contains(e) && (this.#u = e);
                return;
            }
            this.#u && setTimeout(()=>{
                this.#u?.focus(), this.#u = null;
            }, 0);
        }
        endDrawingSession(t = !1) {
            return this.#h ? (this.#a.setCurrentDrawingSession(null), this.#h.abort(), this.#h = null, this.#u = null, this.#g.endDrawing(t)) : null;
        }
        findNewParent(t, e, s) {
            const i = this.#a.findParent(e, s);
            return i === null || i === this ? !1 : (i.changeParent(t), !0);
        }
        commitOrRemove() {
            return this.#h ? (this.endDrawingSession(), !0) : !1;
        }
        onScaleChanging() {
            this.#h && this.#g.onScaleChangingWhenDrawing(this);
        }
        destroy() {
            this.commitOrRemove(), this.#a.getActive()?.parent === this && (this.#a.commitOrRemove(), this.#a.setActiveEditor(null)), this.#r && (clearTimeout(this.#r), this.#r = null);
            for (const t of this.#n.values())this.#t?.removePointerInTextLayer(t.contentDiv), t.setParent(null), t.isAttachedToDOM = !1, t.div.remove();
            this.div = null, this.#n.clear(), this.#a.removeLayer(this);
        }
        #A() {
            for (const t of this.#n.values())t.isEmpty() && t.remove();
        }
        render({ viewport: t }) {
            this.viewport = t, Ht(this.div, t);
            for (const e of this.#a.getEditors(this.pageIndex))this.add(e), e.rebuild();
            this.updateMode();
        }
        update({ viewport: t }) {
            this.#a.commitOrRemove(), this.#A();
            const e = this.viewport.rotation, s = t.rotation;
            if (this.viewport = t, Ht(this.div, {
                rotation: s
            }), e !== s) for (const i of this.#n.values())i.rotate(s);
        }
        get pageDimensions() {
            const { pageWidth: t, pageHeight: e } = this.viewport.rawDims;
            return [
                t,
                e
            ];
        }
        get scale() {
            return this.#a.viewParameters.realScale;
        }
    }
    class ht {
        #t = null;
        #e = 0;
        #s = new Map;
        #i = new Map;
        constructor({ pageIndex: t }){
            this.pageIndex = t;
        }
        setParent(t) {
            if (!this.#t) {
                this.#t = t;
                return;
            }
            if (this.#t !== t) {
                if (this.#s.size > 0) for (const e of this.#s.values())e.remove(), t.append(e);
                this.#t = t;
            }
        }
        static get _svgFactory() {
            return O(this, "_svgFactory", new Je);
        }
        static #r(t, [e, s, i, n]) {
            const { style: r } = t;
            r.top = `${100 * s}%`, r.left = `${100 * e}%`, r.width = `${100 * i}%`, r.height = `${100 * n}%`;
        }
        #n() {
            const t = ht._svgFactory.create(1, 1, !0);
            return this.#t.append(t), t.setAttribute("aria-hidden", !0), t;
        }
        #l(t, e) {
            const s = ht._svgFactory.createElement("clipPath");
            t.append(s);
            const i = `clip_${e}`;
            s.setAttribute("id", i), s.setAttribute("clipPathUnits", "objectBoundingBox");
            const n = ht._svgFactory.createElement("use");
            return s.append(n), n.setAttribute("href", `#${e}`), n.classList.add("clip"), i;
        }
        #o(t, e) {
            for (const [s, i] of Object.entries(e))i === null ? t.removeAttribute(s) : t.setAttribute(s, i);
        }
        draw(t, e = !1, s = !1) {
            const i = this.#e++, n = this.#n(), r = ht._svgFactory.createElement("defs");
            n.append(r);
            const a = ht._svgFactory.createElement("path");
            r.append(a);
            const o = `path_p${this.pageIndex}_${i}`;
            a.setAttribute("id", o), a.setAttribute("vector-effect", "non-scaling-stroke"), e && this.#i.set(i, a);
            const l = s ? this.#l(r, o) : null, h = ht._svgFactory.createElement("use");
            return n.append(h), h.setAttribute("href", `#${o}`), this.updateProperties(n, t), this.#s.set(i, n), {
                id: i,
                clipPathId: `url(#${l})`
            };
        }
        drawOutline(t, e) {
            const s = this.#e++, i = this.#n(), n = ht._svgFactory.createElement("defs");
            i.append(n);
            const r = ht._svgFactory.createElement("path");
            n.append(r);
            const a = `path_p${this.pageIndex}_${s}`;
            r.setAttribute("id", a), r.setAttribute("vector-effect", "non-scaling-stroke");
            let o;
            if (e) {
                const d = ht._svgFactory.createElement("mask");
                n.append(d), o = `mask_p${this.pageIndex}_${s}`, d.setAttribute("id", o), d.setAttribute("maskUnits", "objectBoundingBox");
                const u = ht._svgFactory.createElement("rect");
                d.append(u), u.setAttribute("width", "1"), u.setAttribute("height", "1"), u.setAttribute("fill", "white");
                const f = ht._svgFactory.createElement("use");
                d.append(f), f.setAttribute("href", `#${a}`), f.setAttribute("stroke", "none"), f.setAttribute("fill", "black"), f.setAttribute("fill-rule", "nonzero"), f.classList.add("mask");
            }
            const l = ht._svgFactory.createElement("use");
            i.append(l), l.setAttribute("href", `#${a}`), o && l.setAttribute("mask", `url(#${o})`);
            const h = l.cloneNode();
            return i.append(h), l.classList.add("mainOutline"), h.classList.add("secondaryOutline"), this.updateProperties(i, t), this.#s.set(s, i), s;
        }
        finalizeDraw(t, e) {
            this.#i.delete(t), this.updateProperties(t, e);
        }
        updateProperties(t, e) {
            if (!e) return;
            const { root: s, bbox: i, rootClass: n, path: r } = e, a = typeof t == "number" ? this.#s.get(t) : t;
            if (a) {
                if (s && this.#o(a, s), i && ht.#r(a, i), n) {
                    const { classList: o } = a;
                    for (const [l, h] of Object.entries(n))o.toggle(l, h);
                }
                if (r) {
                    const l = a.firstChild.firstChild;
                    this.#o(l, r);
                }
            }
        }
        updateParent(t, e) {
            if (e === this) return;
            const s = this.#s.get(t);
            s && (e.#t.append(s), this.#s.delete(t), e.#s.set(t, s));
        }
        remove(t) {
            this.#i.delete(t), this.#t !== null && (this.#s.get(t).remove(), this.#s.delete(t));
        }
        destroy() {
            this.#t = null;
            for (const t of this.#s.values())t.remove();
            this.#s.clear(), this.#i.clear();
        }
    }
    globalThis.pdfjsTestingUtils = {
        HighlightOutliner: He
    };
    L.AbortException;
    L.AnnotationEditorLayer;
    L.AnnotationEditorParamsType;
    L.AnnotationEditorType;
    L.AnnotationEditorUIManager;
    L.AnnotationLayer;
    L.AnnotationMode;
    L.ColorPicker;
    L.DOMSVGFactory;
    L.DrawLayer;
    L.FeatureTest;
    var hr = L.GlobalWorkerOptions;
    L.ImageKind;
    L.InvalidPDFException;
    L.MissingPDFException;
    L.OPS;
    L.OutputScale;
    L.PDFDataRangeTransport;
    L.PDFDateString;
    L.PDFWorker;
    L.PasswordResponses;
    L.PermissionFlag;
    L.PixelsPerInch;
    L.RenderingCancelledException;
    L.TextLayer;
    L.TouchManager;
    L.UnexpectedResponseException;
    L.Util;
    L.VerbosityLevel;
    L.XfaLayer;
    L.build;
    L.createValidAbsoluteUrl;
    L.fetchData;
    var cr = L.getDocument;
    L.getFilenameFromUrl;
    L.getPdfFilenameFromUrl;
    L.getXfaPageViewport;
    L.isDataScheme;
    L.isPdfFile;
    L.noContextMenu;
    L.normalizeUnicode;
    L.setLayerDimensions;
    L.shadow;
    L.stopEvent;
    L.version;
    const dr = "/assets/pdf.worker.min-yatZIOMy.mjs";
    var ur = Ft('<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center"><div class="font-mono text-xs text-destructive">File deleted</div><div class="max-w-full truncate font-mono text-xs text-muted-foreground">'), fr = Ft('<div class="flex min-h-0 flex-1 flex-col bg-muted/20">'), pr = Ft('<div class="flex h-8 items-center justify-between border-b border-border px-2 font-mono text-[11px]"><div class=text-muted-foreground>PDF</div><div class="flex items-center gap-2"><button class="flex h-6 w-6 items-center justify-center border border-border disabled:opacity-40"title="Previous page"></button><span class="min-w-[64px] text-center text-muted-foreground"></span><button class="flex h-6 w-6 items-center justify-center border border-border disabled:opacity-40"title="Next page">'), gr = Ft('<div class="absolute inset-0 flex items-center justify-center bg-background/80 font-mono text-xs text-muted-foreground">Rendering...'), mr = Ft('<div class=relative><canvas class="border border-border bg-white">'), br = Ft('<div class="flex min-h-0 flex-1 items-start justify-center overflow-auto p-2">'), Ar = Ft('<div class="flex h-full w-full flex-col items-center justify-center gap-3 text-center"><div class="font-mono text-xs text-muted-foreground">No PDF data'), yr = Ft('<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 px-2 text-center"><div class="font-mono text-xs text-destructive">');
    hr.workerSrc = dr;
    function vr(c) {
        const t = c.includes(",") ? c.split(",")[1] : c, e = atob(t), s = new Uint8Array(e.length);
        for(let i = 0; i < e.length; i += 1)s[i] = e.charCodeAt(i);
        return s;
    }
    _r = function(c) {
        const [t, e] = Ot(null), [s, i] = Ot(1), [n, r] = Ot(0), [a, o] = Ot(!1), [l, h] = Ot(null), [d, u] = Ot(0), [f, p] = Ot(!1);
        let g, b, m = null, A = 0, y = null, v = null, w = !0;
        const S = (P)=>{
            w && u((B)=>Math.abs(B - P) >= 1 ? P : B);
        }, _ = Zs((P)=>{
            S(P);
        }, 80), R = ti((P)=>{
            S(P);
        }, 180), M = (P)=>P instanceof Error ? P.name === "RenderingCancelledException" || P.message.includes("Rendering cancelled") : !1, $ = async ()=>{
            const P = v;
            if (v = null, !!P) try {
                P.cancel?.(), await P.promise;
            } catch  {}
        }, D = async ()=>{
            await $();
            const P = y;
            if (y = null, e(null), r(0), i(1), !!P) try {
                await P.destroy();
            } catch  {}
        }, j = async ()=>{
            if (h(null), o(!1), p(!1), !c.src) {
                await D();
                return;
            }
            try {
                await D();
                const P = vr(c.src), E = await cr({
                    data: P
                }).promise;
                y = E, e(E), r(E.numPages), i(1);
            } catch  {
                h("Failed to open PDF"), await D();
            }
        }, K = async ()=>{
            const P = t(), B = s(), E = d();
            if (!P || !g || !b || E <= 0) return;
            const x = ++A;
            if (await $(), x !== A) return;
            o(!0), h(null);
            let z = null;
            try {
                const Y = await P.getPage(B), et = Y.getViewport({
                    scale: 1
                });
                if (!f()) {
                    const ae = Math.min(Math.max(et.width + 24, 360), 960), xe = Math.min(Math.max(et.height + 64, 260), 1200);
                    c.onContentReady?.({
                        width: ae,
                        height: xe
                    }), p(!0);
                }
                const X = Math.max(E - 16, 1) / et.width, W = Y.getViewport({
                    scale: X
                }), Ct = g.getContext("2d"), vt = Math.min(window.devicePixelRatio || 1, 2), rt = Math.ceil(W.width), U = Math.ceil(W.height);
                if (!Ct) throw new Error("Missing canvas context");
                g.width = Math.floor(rt * vt), g.height = Math.floor(U * vt), g.style.width = `${rt}px`, g.style.height = `${U}px`;
                const Mt = vt !== 1 ? [
                    vt,
                    0,
                    0,
                    vt,
                    0,
                    0
                ] : void 0;
                z = Y.render({
                    canvasContext: Ct,
                    viewport: W,
                    transform: Mt
                }), v = z, await z.promise, v === z && (v = null), x === A && o(!1);
            } catch (Y) {
                if (v === z && (v = null), x !== A || M(Y)) return;
                x === A && (o(!1), h("Failed to render page"));
            }
        };
        return is(()=>{
            j();
        }), is(()=>{
            K();
        }), ei(()=>{
            b && (S(b.clientWidth), m = new ResizeObserver((P)=>{
                const B = P[0]?.contentRect.width ?? 0;
                _(B), R(B);
            }), m.observe(b));
        }), si(()=>{
            w = !1, m?.disconnect(), m = null, D();
        }), (()=>{
            var P = fr();
            return bt(P, Tt(oe, {
                get when () {
                    return c.isDeleted;
                },
                get fallback () {
                    return [
                        (()=>{
                            var B = pr(), E = B.firstChild, x = E.nextSibling, z = x.firstChild, Y = z.nextSibling, et = Y.nextSibling;
                            return z.$$click = ()=>i((G)=>Math.max(1, G - 1)), bt(z, Tt(ii, {
                                size: 14
                            })), bt(Y, (()=>{
                                var G = ni(()=>n() > 0);
                                return ()=>G() ? `${s()} / ${n()}` : "-- / --";
                            })()), et.$$click = ()=>i((G)=>Math.min(n(), G + 1)), bt(et, Tt(ri, {
                                size: 14
                            })), ai((G)=>{
                                var X = s() <= 1 || !t(), W = s() >= n() || !t();
                                return X !== G.e && (z.disabled = G.e = X), W !== G.t && (et.disabled = G.t = W), G;
                            }, {
                                e: void 0,
                                t: void 0
                            }), B;
                        })(),
                        (()=>{
                            var B = br(), E = b;
                            return typeof E == "function" ? rs(E, B) : b = B, bt(B, Tt(oe, {
                                get when () {
                                    return c.src;
                                },
                                get fallback () {
                                    return (()=>{
                                        var x = Ar(), z = x.firstChild;
                                        return bt(x, Tt(oi, {
                                            size: 48,
                                            class: "text-muted-foreground"
                                        }), z), x;
                                    })();
                                },
                                get children () {
                                    var x = mr(), z = x.firstChild;
                                    bt(x, Tt(oe, {
                                        get when () {
                                            return a();
                                        },
                                        get children () {
                                            return gr();
                                        }
                                    }), z), bt(x, Tt(oe, {
                                        get when () {
                                            return l();
                                        },
                                        children: (et)=>(()=>{
                                                var G = yr(), X = G.firstChild;
                                                return bt(G, Tt(ns, {
                                                    size: 24,
                                                    class: "text-destructive"
                                                }), X), bt(X, et), G;
                                            })()
                                    }), z);
                                    var Y = g;
                                    return typeof Y == "function" ? rs(Y, z) : g = z, x;
                                }
                            })), B;
                        })()
                    ];
                },
                get children () {
                    var B = ur(), E = B.firstChild, x = E.nextSibling;
                    return bt(B, Tt(ns, {
                        size: 48,
                        class: "text-destructive"
                    }), E), bt(x, ()=>c.path), B;
                }
            })), P;
        })();
    };
    li([
        "click"
    ]);
});
export { _r as PdfViewer, __tla };
