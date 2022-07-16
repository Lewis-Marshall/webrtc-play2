import { createSignal, onCleanup, Component } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";
import adapter from "webrtc-adapter";

const App: Component = () => {
  const [state, setState] = createStore({
    connected: false,
    localMessages: "",
    remoteMessages: ""
  });
  let _localConnection, _remoteConnection, _localChannel, _remoteChannel;

  const [count, setCount] = createSignal(0);
  const timer = setInterval(() => setCount((c) => c + 1), 1000);

  onCleanup(() => clearInterval(timer));

  const connect = async () => {
    console.log("connect!");

    try {
      const dataChannelParams = { ordered: true };
      window.localConnection = _localConnection = new RTCPeerConnection();
      _localConnection.addEventListener("icecandidate", async (e) => {
        console.log("local connection ICE candidate: ", e.candidate);
        await _remoteConnection.addIceCandidate(e.candidate);
      });
      window.remoteConnection = _remoteConnection = new RTCPeerConnection();
      _remoteConnection.addEventListener("icecandidate", async (e) => {
        console.log("remote connection ICE candidate: ", e.candidate);
        await _localConnection.addIceCandidate(e.candidate);
      });
  
      window.localChannel = _localChannel = _localConnection.createDataChannel(
        "messaging-channel",
        dataChannelParams
      );
      _localChannel.binaryType = "arraybuffer";
      _localChannel.addEventListener("open", () => {
        console.log("Local channel open!");
        setState({connected: true});
      });
      _localChannel.addEventListener("close", () => {
        console.log("Local channel closed!");
        setState({connected: false});
      });
      _localChannel.addEventListener(
        "message",
        _onLocalMessageReceived
      );
  
      _remoteConnection.addEventListener(
        "datachannel",
        _onRemoteDataChannel
      );
  
      const initLocalOffer = async () => {
        const localOffer = await _localConnection.createOffer();
        console.log(`Got local offer ${JSON.stringify(localOffer)}`);
        const localDesc = _localConnection.setLocalDescription(localOffer);
        const remoteDesc = _remoteConnection.setRemoteDescription(
          localOffer
        );
        return Promise.all([localDesc, remoteDesc]);
      };
  
      const initRemoteAnswer = async () => {
        const remoteAnswer = await _remoteConnection.createAnswer();
        console.log(`Got remote answer ${JSON.stringify(remoteAnswer)}`);
        const localDesc = _remoteConnection.setLocalDescription(
          remoteAnswer
        );
        const remoteDesc = _localConnection.setRemoteDescription(
          remoteAnswer
        );
        return Promise.all([localDesc, remoteDesc]);
      };
  
      await initLocalOffer();
      await initRemoteAnswer();
    } catch (e) {
      console.log(e);
    }
  };

  const _onLocalMessageReceived = (event) => {
    console.log(`Remote message received by local: ${event.data}`);
    state.localMessages += event.data + '\n';
  }

  const _onRemoteDataChannel = (event) => {
    console.log(`onRemoteDataChannel: ${JSON.stringify(event)}`);
    window.remoteChannel = _remoteChannel = event.channel;
    _remoteChannel.binaryType = 'arraybuffer';
    _remoteChannel.addEventListener('message', _onRemoteMessageReceived.bind(this));
    _remoteChannel.addEventListener('close', () => {
      console.log('Remote channel closed!');
      state.connected = false;
    });
  }

  const _onRemoteMessageReceived = (event) => {
    console.log(`Local message received by remote: ${event.data}`);
    setState({remoteMessages: state.remoteMessages +event.data + '\n'});
  }

  const _sendMessage = (selector, channel) => {
    //const textarea = ShadowRoot.prototype.querySelector(selector);
    const value = "HELLO";
    if (value === '') {
      console.log('Not sending empty message!');
      return;
    }
    console.log('Sending remote message: ', value);
    channel.send(value);
    //textarea.value = '';
  }

  return (
  <>
    <div>{count()}</div>
    <button onClick={connect}>Join</button>

    <div class="messageBox">
      <label for="localOutgoing">Local outgoing message:</label>
      <textarea class="message" id="localOutgoing" 
                placeholder="Local outgoing message goes here."></textarea>
      <button disabled={!state.connected} onClick={e => _sendMessage('#localOutgoing', _localChannel} 
      id="sendLocal">Send message from local</button>
    </div>
    <div class="messageBox">
        <label for="localIncoming">Local incoming messages:</label>
        <textarea class="message" id="localIncoming" disabled 
                  placeholder="Local incoming messages arrive here.">{state.localMessages}</textarea>
    </div>
    <div class="messageBox">
        <label for="remoteOutgoing">Remote outgoing message:</label>
        <textarea class="message" id="remoteOutgoing" 
                  placeholder="Remote outgoing message goes here."></textarea>
        <button disabled={!state.connected} onClick={e => _sendMessage('#remoteOutgoing', _remoteChannel)} 
        id="sendRemote">Send message from remote</button>
    </div>
    <div class="messageBox">
        <label for="remoteIncoming">Remote incoming messages:</label>
        <textarea class="message" id="remoteIncoming" disabled
                  placeholder="Remote incoming messages arrive here.">{state.remoteMessages}</textarea>
    </div>
  </>);

  
};


render(() => <App />, document.getElementById("app"));
