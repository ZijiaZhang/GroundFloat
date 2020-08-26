import React from "react";
import { RouteComponentProps } from 'react-router-dom';


export class MainRoom extends React.Component<RouteComponentProps<any>, {}>{
    create(){
        let id = (document.getElementById("room_number") as HTMLInputElement).value;
        this.props.history.push(`/room/${id}`)
    }

    render(){
        return (
            <div>
                <img src="/image/icon.jpeg"/>
                <input type="text" id="room_number" placeholder="Enter a Room number"/>
                <button onClick={() => this.create()}>Create/Join Room</button>
                <span className="message">{new URLSearchParams(this.props.location.search).get('message')}</span>
            </div>
        )
    }
}