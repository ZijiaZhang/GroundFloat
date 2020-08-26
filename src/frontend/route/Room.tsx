import React, {ChangeEvent, createRef, useRef} from "react";
import io from "socket.io-client";
import {RouteComponentProps} from "react-router-dom";
import Peer from "simple-peer";
import streamSaver from "streamsaver";
import {SocketEvents} from "../../shared/socketEvents";
import {IReceiveSignal, IUserJoinPayload} from "../../shared/Inerfaces";


interface IRoomState {
    connectionEstablished: boolean;
    file: any;
    files: any[];
    sendFileSize: number;
    sendProgress: number;
    sending: boolean;
    receiveFileSize: number;
    receiveProgress: number;
}

const worker = new Worker("../worker.js");


export class Room extends React.Component<RouteComponentProps<any>, IRoomState>{
    peer: any = null;
    socket: any = null;
    fileName = "";
    roomID = this.props.match.params.roomID;

    constructor(props: RouteComponentProps<any>) {
        super(props);
        this.state = {
            connectionEstablished: false,
            file: null,
            sending: false,
            receiveFileSize: 0,
            receiveProgress: 0,
            files: [],
            sendFileSize: 0,
            sendProgress: 0
        }
    }

    componentDidMount(): void {
        this.socket = io.connect("/");

        this.socket.on(SocketEvents.All_Users, (users: string[]) => {
            this.peer = this.createPeer(users[0], this.socket.id);
        });

        this.socket.on(SocketEvents.User_Joined, (payload: IUserJoinPayload) => {
            this.peer = this.addPeer(payload.signal, payload.callerID);
        });

        this.socket.on(SocketEvents.Receive_Signal, (payload: IReceiveSignal) => {
            this.peer.signal(payload.signal);
            this.setState({connectionEstablished: true});
        });

        this.socket.on(SocketEvents.Room_Full, () => {
            this.error("Room Is full");
        });

        this.socket.on(SocketEvents.User_Left, () => {
            this.error("The other user Left");
        });
        this.socket.emit(SocketEvents.Join_Room, this.roomID);

        this.socket.on(SocketEvents.Sending_File, (data: any) => {
            this.setState({sending: true});
        });
        this.socket.on(SocketEvents.File_Size, (data: any) => {
            if(this.socket.id !== data.id) {
                this.setState({receiveFileSize: data.size});
                this.setState({receiveProgress: 0});
            }
        });

        worker.addEventListener("message", (event: any) => {
            if(event.data.url){
                console.log(event);
                event.data.name = this.fileName;
                this.setState({files: [... this.state.files, event.data]})
            }
        });
    }

    private error(message: string) {
        this.socket.disconnect();
        alert(message);
        this.props.history.push(`/?message=${encodeURIComponent(`Room Closed: ${message}`)}`);
    }

    createPeer(userToSignal: string, callerID: string) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            config: {
                iceServers :[{
                    urls: "stun:stun.l.google.com:19302"
                },{
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'psox!HUTH1clor1wux',
                    username: 'a15116910572@gmail.com'
                }]
            }
        });

        peer.on("signal", signal => {
            this.socket.emit(SocketEvents.Sending_Signal, { userToSignal, callerID, signal });
        });

        peer.on("data", (d) => this.handleReceivingData(d));

        peer.on("error", (e: Error) => {
            console.error(e);
            this.error(e.message);
        });

        return peer;
    }

    addPeer(incomingSignal: string, callerID: string) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            config: {
                iceServers :[{
                    urls: "stun:stun.l.google.com:19302"
                },{
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'psox!HUTH1clor1wux',
                    username: 'a15116910572@gmail.com'
                }]
            }
        });


        peer.on("signal", signal => {
            this.socket.emit(SocketEvents.Returning_Signal, { signal, callerID });
        });

        peer.on("data", (d) => this.handleReceivingData(d));

        peer.on("error", (e: Error) => {
            console.error(e);
            this.error(e.message);
        });

        peer.signal(incomingSignal);
        this.setState({connectionEstablished: true});
        return peer;
    }

    handleReceivingData(data: any) {
        if (data.toString().includes("done")) {
            this.setState({sending:false});
            const parsed = JSON.parse(data);
            this.fileName = parsed.fileName;
            this.download();
        } else {
            //console.log(`receive${data}`);
            this.setState({receiveProgress: this.state.receiveProgress + data.byteLength});
            worker.postMessage(data);
        }
    }

    download() {
        worker.postMessage("download");
    }

    selectFile(e: any) {
        this.setState({file: e.target.files[0]});
    }

    async sendFile() {
        const peer = this.peer;
        const size = this.state.file.size;
        this.setState({sending: true, sendFileSize: size});
        this.socket.emit(SocketEvents.Sending_File);
        this.socket.emit(SocketEvents.File_Size, size);
        // const stream = this.state.file.stream();
        const chunkSize = 16384;
        const fileReader = new FileReader();
        let offset = 0;
        fileReader.addEventListener('error', error => console.error('Error reading file:', error));
        fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
        fileReader.addEventListener('load', e => {
            // console.log('FileRead.onload ', e);
            peer.send((e.target!.result as ArrayBuffer));
            offset += (e.target!.result! as ArrayBuffer).byteLength;
            if (offset < size) {
                readSlice(offset);
            } else{
                this.setState({sending:false});
                peer.write(JSON.stringify({ done: true, fileName: this.state.file.name }));
            }
        });

        const readSlice = (o: any) => {
            //console.log('readSlice ', o);
            const slice = this.state.file.slice(offset, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };
        readSlice(0);

        let that = this;
        let handle = setInterval(update_frontend, 100);
        function update_frontend() {
            if(offset === size){
                clearInterval(handle);
            }
            that.setState({sendProgress: offset});
        }
    }

    render() {
        let body;
        if (this.state.connectionEstablished) {
            body = (
                <div>
                    <input onChange={(e:any) =>
                        this.selectFile(e)}  type="file" className="custom-file-input" id="validatedCustomFile" disabled={this.state.sending}/>
                    <label className="custom-file-label" htmlFor="validatedCustomFile"> {this.state.file? this.state.file.name: "Choose file..."}</label>
                    <button onClick={() => this.sendFile()} disabled={this.state.sending}>Send file</button>
                    <p>Send Progress:</p><progress max={this.state.sendFileSize || 1} value={this.state.sendProgress}/>
                    <p>Receive Progress:</p> <progress max={this.state.receiveFileSize || 1} value={this.state.receiveProgress}/>
                </div>
            );
        } else {
            body = (
                <h1>Wait for the other user to connect. Please let the other user enter the same room number.</h1>
            );
        }


        let downloadPrompt;

        if (this.state.files.length) {
            downloadPrompt = (
                <div>
                	<span>Downloads:</span>
                    {this.state.files.map((e) => <a className="download-link" key={e.url} download={e.name} href={e.url}>{e.name}</a>)}
                </div>
            );
        }

        return (
            <div>
                {body}
                {downloadPrompt}
            </div>
        );
    }

}