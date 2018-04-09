'use strict';

const Controller = require('egg').Controller;

class IndexController extends Controller {
  async index() {
    await this.ctx.render('../view/index.nj',{ title: '首页' });
  }
  async readPath() {
    await this.ctx.render('../view/readPath.nj',{ title: '读取文件路径' });
  }
  async writefile() {
    console.log(this.ctx.request.body.params)
    return this.ctx.body = {code:200,msg:'success'};
  }
  async writeData() {
    console.log(this.ctx.request.body.params)
    return this.ctx.body = {code:200,msg:'success'};
  }
}

module.exports = IndexController;
