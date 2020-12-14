let Socket = ''
let setPingAndReconnectionPush = null
let wsUrl;
let reconnectionNum;
let reconnectionNow=0;
let relinkOrClose = true;
let config;
let setType;


//创建连接
export function createSocket(){
    let _url,_recNum,_error,_message,_close,_open;
    if(!arguments[0]){
        console.error("Function must transmit url parameter by createSocket")
        return false;
    }
    if(Object.prototype.toString.call(arguments[0])==="[object String]"){
        setType = "str"
        _url = arguments[0];
        _recNum = arguments[1] || 10;
        _error = function(){};
        _message = function(){};
        _close = function(){};
        _open = function(){}
    }
    else {
        setType = "obj"
        config = arguments[0];
        let _set = arguments[0];
        _url = _set.url;
        _recNum = _set.recNum || 10;
        _error = _set.error || function(){};
        _message = _set.message || function(){};
        _close = _set.close || function(){};
        _open = _set.open || function(){}
    }
    if (!Socket) {
        wsUrl = _url
        reconnectionNum = _recNum;
        relinkOrClose = true;
        Socket = new WebSocket(_url)
        Socket.onopen = function (){
            sendPing()
            _open()
        }
        Socket.onmessage = function (e){
            console.log(e);
            _message(e.data);
            window.dispatchEvent(new CustomEvent('msgChange', {
                detail: {
                    data: e.data
                }
            }))
        }
        Socket.onerror = function (){
            _error()
            Socket.close()
            clearInterval(setPingAndReconnectionPush)
            if (Socket.readyState !== 3) {
                Socket = null
                if(setType === "srt") createSocket(wsUrl,reconnectionNum)
                else createSocket(config)
            }
        }
        Socket.onclose = function () {
            if(relinkOrClose) relink()
            else close(_close)
        }
    }
    else {
        console.error("Repeat create connection");
    }
}

//发送消息
const connecting = message => {
    setTimeout(() => {
        if (Socket.readyState === 0) {
            connecting(message)
        } else {
            Socket.send(JSON.stringify(message))
        }
    }, 1000)
}

//定义发送的消息消息
export function sendWSPush(){
    let _set,_message,_success,_error,_type
    if(arguments[0].dgSend){
        _set = arguments[0];
        _type = "obj"
    }else {
        _message=arguments[0];
        _success=arguments[1]||function (){};
        _error=arguments[2]||function (){};
        _type = "str";
    }
    if (Socket !== null && Socket.readyState === 3) {
        Socket.close()
        if(setType === "srt") createSocket(wsUrl,reconnectionNum)
        else createSocket(config)
        switch (_type){
            case "str":
                _error({code:400})
                break
            case "obj":
                _set.error({code:400})
        }
        console.error("Connection creation failed")
    } else if (Socket.readyState === 1) {
        switch (_type){
            case "str":
                Socket.send(JSON.stringify(_message))
                _success({code:400})
                break
            case "obj":
                Socket.send(JSON.stringify(_set.dgSend))
                _set.success({code:200})
        }
    } else if (Socket.readyState === 0) {
        switch (_type){
            case "str":
                connecting(_message)
                break
            case "obj":
                connecting(_set.dgSend)
        }

    }
}

//关闭事件
const close = (callBack) => {
    clearInterval(setPingAndReconnectionPush)
    Socket.close()
    Socket = ''
    wsUrl=null;
    reconnectionNum=null;
    reconnectionNow=0;
    relinkOrClose=true;
    callBack();
}

//重连
const relink = () => {
    console.info("Attempting "+(reconnectionNow+1)+"th reconnection");
    if (Socket.readyState !== 2) {
        Socket = null
        if(setType === "srt") createSocket(wsUrl,reconnectionNum)
        else createSocket(config)
        reconnectionNow++;
        reconnection();
    }
}

//发送心跳
export const sendPing = (time = 5000, ping = {name:"pingTest",message:"ping"}) => {
    clearInterval(setPingAndReconnectionPush)
    Socket.send(JSON.stringify(ping))
    setPingAndReconnectionPush = setInterval(() => {
        Socket.send(JSON.stringify(ping))
        console.log(Socket);
    }, time)
}

//判断重连
const reconnection = () => {
    if(reconnectionNow>=reconnectionNum){
        clearInterval(setPingAndReconnectionPush)
        relinkOrClose = false;
        Socket.close()
        console.error("Reconnection failed,close connection");
    }
}

//关闭
export const closeWS = () => {
    clearInterval(setPingAndReconnectionPush)
    relinkOrClose = false;
    Socket.close()
}
