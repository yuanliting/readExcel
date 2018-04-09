// app/router/admin/admin.js
module.exports = app => {
    const { router, controller } = app;
    router.get('/',                 controller.index.index                );   //首页页面
    router.post('/writefile',       controller.index.writefile            );   //读数据
    router.get('/readPath',       controller.index.readPath            );   //读excel路径页面
    router.get('/writeData',       controller.index.writeData            );   //根据路径读取excel文件数据
    
};