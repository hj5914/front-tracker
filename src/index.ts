import info from './info'
/**
 * @project 项目标识符
 * @requestUrl 接口地址
 * @historyTracker history上报
 * @hashTracker hash上报
 * @domTracker 携带 data-tracker 点击事件上报
 * @jsError js 报错异常上报
 * @ajaxTracker 请求上报
*/
interface TrackerDefaultOptions {
  requestUrl: string | undefined,
  historyTracker: boolean,
  hashTracker: boolean,
  domTracker: boolean,
  sdkVersion: string | number,
  jsError:boolean,
  ajaxTracker: boolean,
}

// 用户必传参数
interface TrackerOptions extends Partial<TrackerDefaultOptions> {
  requestUrl: string,
  project: string
}

type SendErrorBaseType = {
  url: string,
  project: string
}
type HistoryTrackerType = {
  type: 'historyChange',
  action: keyof History
}
type HashTrackerType = {
  type: 'hashchange',
  oldURL: string
}
type DomTrackerType = {
  type: 'dom';
  action: 'click'
  message: string;
}
type SourceErrorType = {
  type: 'sourceError';
  tagName: string;
  source: string;
}
type JsErrorType = {
  type: 'jsError';
  message: string;
  filename: string;
  colno: number;
  lineno: number;
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

type UserId = string | number | undefined
class Tracker {
  private getUser: () => UserId = () => undefined
  private requestUrl: string = ''
  private project: string = ''

  public constructor(trackerOptions: TrackerOptions) {
    if (!trackerOptions) return
    const { requestUrl, project } = trackerOptions
    if (!requestUrl || !project) return
    this.requestUrl = requestUrl
    this.project = project

    trackerOptions.historyTracker && this.historyTracker()
    trackerOptions.hashTracker && this.hashTracker()
    trackerOptions.domTracker && this.domTracker()
    trackerOptions.jsError && this.jsError()
    trackerOptions.ajaxTracker && this.ajaxTracker()
  }
  
  // 配置用户信息
  public setUser(callback: typeof this.getUser) { 
    this.getUser = callback
  }

  // 自定义上报
  public customSendData(data: CustomDataType) {
    this.sendData<CustomDataType>(data)
  } 

  // 数据上报
  private sendData<T>(data: T) {
    const params: T & SendErrorBaseType = Object.assign({}, data, {
      url: window.location.href,
      project: this.project,
      userId: this.getUser(),
      ...info
    })
    const formData = new FormData()
    Object.entries(params).forEach(([key, value]) => formData.append(key, value + ''))
    navigator.sendBeacon(this.requestUrl, formData)
  } 

  // history监听
  private historyTracker() {
    const historyType: Partial<keyof History>[] = ['pushState', 'replaceState']
    historyType.forEach((item: keyof History) => {
      let origin = history[item]
      let eventHistory = new Event(item);
      (window.history[item] as any) = function(this: any) {
        origin.apply(this, arguments)
        window.dispatchEvent(eventHistory)
      }
      window.addEventListener(item, () => {
        this.sendData<HistoryTrackerType>({
          type: `historyChange`,
          action: item
        })
      })
    })
  }

  // hash监听
  private hashTracker() { 
    window.addEventListener('hashchange', (e: HashChangeEvent) => {
      this.sendData<HashTrackerType>({
        type: `hashchange`,
        oldURL: e.oldURL
      })
    })
  }

  // dom点击监听
  private domTracker() {
    window.addEventListener('click', e => {
      let element = e.target as HTMLElement
      let message = element.getAttribute('data-tracker')
      message && this.sendData<DomTrackerType>({
        type: `dom`,
        action: 'click',
        message
      })
    })
  }

  // js报错监听
  private jsError() {
    window.addEventListener('error', (e: ErrorEvent | Event) => {
      e.preventDefault()
      if (e instanceof ErrorEvent) {
        if (e.error.hasBeenCaught !== undefined) return false
        e.error.hasBeenCaught = true
        const { colno, lineno, filename, message } = e
        this.sendData<JsErrorType>({
          type: 'jsError',
          colno, lineno, filename, message
        })
      } else { 
        const target = e.target as HTMLElement
        const source = target.getAttribute('src') || target.getAttribute('href')
        source && this.sendData<SourceErrorType>({
          type: 'sourceError',
          source, tagName: target.tagName
        })
      }
    }, true)
  }

  // 请求监听
  private ajaxTracker() {
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
        that.sendData<AjaxTracker>({
          type: 'ajaxTracker',
          timeStampCompute: this.timeStampCompute,
          status, timeout, responseText, method, requestUrl 
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