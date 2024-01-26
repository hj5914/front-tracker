/**
 * @project 项目标识符
 * @requestUrl 接口地址
 * @historyTracker history上报
 * @hashTracker hash上报
 * @domTracker 携带 data-tracker 点击事件上报
 * @jsError js 报错异常上报
 * @ajaxTracker 请求上报
*/
export interface TrackerDefaultOptions {
  requestUrl: string | undefined,
  historyTracker: boolean,
  hashTracker: boolean,
  domTracker: boolean,
  sdkVersion: string | number,
  jsError:boolean,
  ajaxTracker: boolean,
}

// 用户必传参数
export interface TrackerOptions extends Partial<TrackerDefaultOptions> {
  requestUrl: string,
  project: string
}

type SendErrorBaseType = {
  time: number,
  url: string,
  project: string
}
type SourceErrorType = {
  type: 'sourceError';
  source: string;
  tagName: string;
}
type JsErrorType = {
  type: 'jsError';
  message: string;
  filename: string;
  colno: number;
  lineno: number;
}
type HistoryTrackerType = {
  type: 'history.pushState' | 'history.replaceState'
}
type HashTrackerType = {
  type: 'hashchange',
  oldURL: string
  
}
type DomTrackerType = {
  type: 'dom.click';
  targetKey: string;
}
type AjaxTracker = {
  type: 'ajaxTracker';
  status: number;
  timeout: number;
  responseText: string;
  method?: string;
  requestUrl?: string;
  timeStampCompute?: number;
}
type CustomDataType = {
  type: string;
  [key: string]: any
}
type SendDataType = SourceErrorType | HistoryTrackerType | DomTrackerType | JsErrorType | AjaxTracker | CustomDataType | HashTrackerType

class Tracker {
  #sdkVersion:string = 'v1.0.0'
  #data:TrackerOptions
  #historyType: Partial<keyof History>[] = ['pushState', 'replaceState']

  public constructor(trackerOptions: TrackerOptions) {
    this.#data = Object.assign(this.initConfig(), trackerOptions)// 初始化配置对象
    this.installExtra()
  }

  // 初始化配置项
  private initConfig():TrackerDefaultOptions {
    return <TrackerDefaultOptions>{
      sdkVersion: this.#sdkVersion,
      historyTracker: false,
      hashTracker: false,
      domTracker: false,
      jsError: false
    }
  }

  // 数据上报
  public customSendData(data: SendDataType) {
    this.sendData(data)
  } 
  private sendData(data: SendDataType) {
    const params: SendDataType & SendErrorBaseType = Object.assign({}, data, {
      time: Date.now(),
      url: window.location.href,
      project: this.#data.project
    })
    const formData = new FormData()
    Object.entries(params).forEach(([key, value]) => formData.append(key, value + ''))
    navigator.sendBeacon(this.#data.requestUrl, formData)
  } 
  private historyTracker() {
    this.#historyType.forEach((item:keyof History) => {
      let origin = history[item]
      let eventHistory = new Event(item);
      (window.history[item] as any) = function(this: any) {
        origin.apply(this, arguments)
        window.dispatchEvent(eventHistory)
      }
      window.addEventListener(item, () => {
        this.sendData({
          type: `history.${item}` as HistoryTrackerType['type']
        })
      })
    })
  }

  private hashTracker() { 
    window.addEventListener('hashchange', (e: HashChangeEvent) => {
      this.sendData({
        type: `hashchange`,
        oldURL: e.oldURL
      })
    })
  }

  private domTracker() {
    window.addEventListener('click', e => {
      let element = e.target as HTMLElement
      let targetKey = element.getAttribute('data-tracker')
      if (targetKey) {
        this.sendData({ type: `dom.click`, targetKey })
      }
    })
  }

  private jsError() {
    window.addEventListener('error', (e: ErrorEvent | Event) => {
      e.preventDefault()
      if (e instanceof ErrorEvent) {
        if (e.error.hasBeenCaught !== undefined) return false
        e.error.hasBeenCaught = true
        const { colno, lineno, filename, message } = e
        this.sendData({ type: 'jsError', colno, lineno, filename, message })
      } else { 
        const target = e.target as HTMLElement
        const source = target.getAttribute('src') || target.getAttribute('href')
        source && this.sendData({
          type: 'sourceError',
          source,
          tagName: target.tagName
        })
      }
    }, true)
  }

  private ajaxTracker() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    const ajaxType: (keyof XMLHttpRequestEventTargetEventMap)[] = [
      'loadstart', // 接收到响应数据时触发
      // 'load', // 请求成功完成时触发
      // 'timeout', // 在预设时间内没有接收到响应时触发
      // 'abort', // 当 request 被停止时触发
      // 'error', // 当 request 遭遇错误时触发
      'loadend' // 请求结束时触发，无论请求成功 ( load) 还是失败 (abort 或 error)
    ]
    function ajaxEventTracker(this: XMLHttpRequest & {
      timeStampCompute?: number;
      requestUrl?: string;
      method?: string;
    }, e: ProgressEvent<XMLHttpRequestEventTarget>) {
      const { type, timeStamp } = e
      const { requestUrl, status, method, timeout } = this
      if (type === 'loadstart') this.timeStampCompute = timeStamp
      if (type === 'loadend') {
        this.timeStampCompute = timeStamp - (this.timeStampCompute || 0)
        let responseText = ''
        if (status !== 200) responseText = this.responseText
        that.sendData({
          type: 'ajaxTracker',
          status, timeout, responseText, method, requestUrl, timeStampCompute: this.timeStampCompute
        })
      }
    }
    const oldOpen = XMLHttpRequest.prototype.open
    window.XMLHttpRequest = class extends XMLHttpRequest {
      private method: string = ''
      private requestUrl: string = ''
      constructor() { 
        super()
        ajaxType.forEach((name) => this.addEventListener<typeof name>(name, function(this, ev) {
          ajaxEventTracker.call(this, ev)
        }, true))
      }
      open() {
        this.method = arguments[0] as string
        this.requestUrl = (arguments[1] as string).split('?')[0]
        return oldOpen.apply(this, arguments as unknown as Parameters<typeof oldOpen>)
      }
    }
  }

  public installExtra() {
    // hash
    if (this.#data.hashTracker) {
      this.hashTracker()
    }
    // history
    if (this.#data.historyTracker) {
      this.historyTracker()
    }
    // dom手动上报
    if (this.#data.domTracker) {
      this.domTracker()
    }
    // jsError
    if (this.#data.jsError) {
      this.jsError()
    }
    // ajaxInfo
    if (this.#data.ajaxTracker) {
      this.ajaxTracker()
    }
  }
}

export default (function() {
  let instance: null | Tracker = null
  return function(trackerOptions: TrackerOptions) {
    if (!instance) { 
      instance = new Tracker(trackerOptions)
    }
    return instance
  }
})()