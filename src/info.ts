export default (function() { 
  let userAgent = navigator.userAgent.toLowerCase() 
  let browser: { browser: string, browserVersion: string } = { browser: '', browserVersion: '' }
  let system: string = ''
  // 浏览器
  let bws = [{
    name: 'IE',
    match: userAgent.match(/rv:([\d.]+)\) like gecko/)
  }, {
    name: 'IE',
    match: userAgent.match(/msie ([\d\.]+)/)
  }, {
    name: 'Edge',
    match: userAgent.match(/edg\/([\d\.]+)/)
  }, {
    name: 'Firefox',
    match: userAgent.match(/firefox\/([\d\.]+)/)
  }, {
    name: 'Opera',
    match: userAgent.match(/(?:opera|opr).([\d\.]+)/)
  }, {
    name: 'Chrome',
    match: userAgent.match(/chrome\/([\d\.]+)/)
  }, {
    name: 'Safari',
    match: userAgent.match(/version\/([\d\.]+).*safari/)
  }]
  for (let i = 0; i < bws.length; i++) {
    if (bws[i].match) {
      browser = {
        browser: bws[i].name,
        browserVersion: bws[i].match?.[1] || ''
      } 
      break
    }
  }
  
  // 系统
  let sys = [{
    name: 'Window',
    match: userAgent.match(/compatible/i)
  }, {
    name: 'Window',
    match: userAgent.match(/Windows/i)
  }, {
    name: 'MacOS',
    match: userAgent.match(/Macintosh/i)
  }, {
    name: 'MacOS',
    match: userAgent.match(/MacIntel/i)
  }, {
    name: 'IOS',
    match: userAgent.match(/iphone/i)
  }, {
    name: 'IOS',
    match: userAgent.match(/Ipad/i)
  }, {
    name: 'Android',
    match: userAgent.match(/android/i)
  }]
  for (let i = 0; i < sys.length; i++) {
    if (sys[i].match) {
      system = sys[i].name
      break
    }
  }
  return { ...browser, system }
})()