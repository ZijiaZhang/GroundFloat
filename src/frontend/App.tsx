import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import {MainRoom} from "./route/MainRoom";
import {Room} from "./route/Room";


export class App extends React.Component<{}, {}>{
    render() {
        return (
            <BrowserRouter>
                <Switch>
                    <Route path="/" exact component={MainRoom}/>
                    <Route path="/room/:roomID" component={Room} />
                </Switch>
            </BrowserRouter>
        )
    }
}
