let array = [];
self.addEventListener("message", event => {
    if (event.data === "download") {
        const blob = new Blob(array);
        self.postMessage({name: 'downloaded', url :URL.createObjectURL(blob)});
        array = [];
    } else {
        array.push(event.data);
    }
});