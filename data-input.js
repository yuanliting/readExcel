var vueApp;
vueApp = new Vue({
    el: '#app',
    data: {
        fileList: []
    },
    methods: {
        handleRemove: function(file, fileList) {
            console.log(file, fileList);
        },
        handlePreview: function(file) {
            console.log(file);
        },
        beforeUpload: function(files, fileList) {
            console.log(files);
        },
        uploadFinished: function(file, fileList) {
            return this.$confirm(`确定移除 ${ file.name }？`);
        }
    }
});

function getCurrentPath(path) {
    var pathArr = [];
    pathArr[0] = path[0].id;
    pathArr[1] = path[1].id;
    pathArr[2] = path[2].id;
    return pathArr;
}
    