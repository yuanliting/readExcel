// 引入config配置模块
var CONFIG = require('../config.js');
var mongoose = require('mongoose');
var server = require('../../start.js').server;
var models = require('../dbhelper/models.js');
var Joi = require('joi');
var _ = require('lodash');
var multiparty = require('multiparty');
var path = require('path');
var crypto = require('crypto'); // 加密库
var fs = require('fs');

function md5(str) {
　　var ret = crypto.createHash('md5').update(str.toString()).digest("hex");
　　return ret;  
}


server.route([
    // 产品详情
    {
        method: 'GET',
        path:'/api/product', 
        handler: async function (request, reply) {
            const productId = request.query.productId || '';
            if(!productId){
                return reply({success: false,info: '产品id缺失'})
            }
            try {
                var product = await models.Product
                                        .findOne({
                                            "_id": productId,
                                            "enabled": true
                                        })
                                        .populate('categoryList')
                                        .exec();
                if(!product){
                    return reply({success: false,info: '产品未找到'})
                }
                // 查询所有检测项目
                var itemAll = await models.Item
                                        .find({
                                            "path.2.id": productId,
                                            "enabled": true
                                        })
                                        .exec();
                // 拼接结果
                var template = {
                    "productId": productId,
                    "state": product.enabled ? 'ACTIVE' : 'INACTIVE',
                    "name": product.name || '', //string, 名称
                    "alias": "", //string, 别名
                    "desc": product.introduce || '', //string, 简介
                    "creator": "", 
                    "created": "", 
                    "modifier": "",
                    "stime": "", 
                    "categories": _.map( _.filter(product.categoryList,{"enabled" : true}), adjustCategory )
                };
                function adjustCategory(category) {
                    var obj = {
                        "categoryId": category._id,
                        "code": category.code || '', //string, 编码
                        "name": category.name || '', 
                        "image": category.image || '', 
                        "picture": category.picture || '', 
                        "desc": category.introduce || '', 
                        "enabled": category.enabled || false,
                        "weighting": category.weight || null, 
                        "items": getItemList(category._id.toString() )
                    }
                    return obj;
                }
                // 获取项目类别下的检测项目
                function getItemList(cid) {
                    var itemList = _.filter(itemAll, function(item){
                        return (item.path[3].id == cid);
                    })
                    itemList = _.map(itemList,function(item){
                        var obj = {
                            "itemId": item._id, 
                            "name": item.name || '', 
                            "code": item.code || '',
                            "alias": '', 
                            "desc": item.introduce || '',
                            "weighting": item.weight || null,
                            "selector": item.scoreTag || "",
                            "enabled": item.enabled || false
                        }
                        return obj;
                    })
                    return itemList;
                }

                return reply({success: true, data: template })
            } catch (error) {
                server.log('error',error);
                return reply({ success: false,info: error.message });
            }
            
        }
    },
    // 项目列表
    {
        method: 'GET',
        path:'/api/item/list', 
        handler: async function (request, reply) {
            const productId = request.query.productId || '';
            if(!productId){
                return reply({success: false,info: '产品id缺失'})
            }
            try {
                var product = await models.Product
                                        .findOne({
                                            "_id": productId,
                                            "enabled": true
                                        })
                                        .populate('categoryList')
                                        .exec();
                if(!product){
                    return reply({success: false,info: '产品未找到'})
                }

                //  逐层查询出 enabled 的 item 列表
                var itemIds = [];
                var activeCategory = _.filter(product.categoryList,{"enabled" : true});
                activeCategory.forEach(function(category){
                    itemIds = _.union( itemIds,category.itemList );
                })
                itemIds = _.uniq(itemIds);
                // 查询所有基因位点
                var itemList = await models.Item
                                        .where("_id").in(itemIds)
                                        .where("enabled").equals(true)
                                        .exec();
                // 查询所有基因位点
                var locusAll = await models.Locus
                                        .find({
                                            "path.2.id": productId,
                                            "enabled": true
                                        })
                                        .populate('literatureList')
                                        .exec();
                // 根据项目查询下属基因位点
                function getLocusList(id) {
                    var locusArr = _.filter(locusAll, function(item){
                        if (item.inReport) return (item.path[4].id == id);
                    })
                    return locusArr;
                }
                
                var resultList = [];
                itemList.forEach(function(item){
                    var obj = {
                        "itemId": item._id,
                        "state": item.enabled ? 'ACTIVE' : 'INACTIVE',
                        "code": item.code || '', //string, 编码
                        "name": item.name || '',  //string, 项目名称
                        "creator": "",
                        "created": "", 
                        "modifier": "", 
                        "stime": "", 
                        "prevalence_rate": "",
                        "model": _.map(item.levelList, adjustModel ),
                        "locus":  _.map( getLocusList(item._id.toString() ), adjustLocus )
                    }
                    resultList.push(obj);
                })

                function adjustModel(level) {
                    var obj = {
                        "label": level.label,
                        "range": {
                            "left": level.left,
                            "right": level.right
                        },
                        "ratio": level.percentage || null
                    }
                    return obj;
                }
                function adjustLocus(item) {
                    var obj = {
                        "og_id": item.code.og || '',
                        "rs_id": item.code.rs || '', 
                        "affy_id": item.code.affy || '', 
                        "hgvs_id": item.code.hgvs || '', 
                        "gene": item.gene || '', 
                        "ref": item.refBase || '', 
                        "alt": item.mutBase || '',
                        "inReport": item.inReport,
                        "rank": null, 
                        "chr": "", 
                        "pattern_wld": { 
                            "brief": item.wilType.label || '',     
                            "or_value": item.wilType.orValue || null
                        },
                        "pattern_het": { 
                            "brief": item.hetType.label || '',     
                            "or_value": item.hetType.orValue || null
                        },
                        "pattern_hom": {
                            "brief": item.homType.label || '',     
                            "or_value": item.homType.orValue || null
                        },
                        "enabled": item.inReport
                    }
                    return obj;
                }
                return reply({success: true, data: resultList })
            } catch (error) {
                server.log('error',error);
                return reply({ success: false,info: error.message });
            }
            
        }
    },
    // 存储分析结果
    {
        method: 'POST',
        path:'/api/upload_result', 
        handler: async function (request, reply) {
            const data = request.payload;
            
            
        }
    },
    // 导出一个产品类别数据
    {
        method: 'GET',
        path:'/test/export_product_data', 
        handler: async function (request, reply) {
            const productId = request.query.productId || '';
            const productName = request.query.productName || '';
            if(!productId){
                return reply({success: false,info: '产品id缺失'})
            }
            if(!productName){
                return reply({success: false,info: '产品name缺失'})
            }
            try {
                var product = await models.Product
                                        .findOne({
                                            "_id": productId,
                                            "enabled": true
                                        })
                                        .populate('categoryList')
                                        .exec();
                if(!product){
                    console.log({success: false,info: '产品未找到'})
                }
                // 查询所有检测项目
                var itemAll = await models.Item
                                        .find({
                                            "path.2.id": productId,
                                            "enabled": true
                                        })
                                        .exec();
                // 查询所有基因位点
                var locusAll = await models.Locus
                                        .find({
                                            "path.2.id": productId,
                                            "enabled": true
                                        })
                                        .populate('literatureList')
                                        .exec();
                

                // 拼接结果
                var template = {
                    "productId": productId,
                    "state": product.enabled ? 'ACTIVE' : 'INACTIVE',
                    "name": product.name || '', //string, 名称
                    //"alias": "", //string, 别名
                    "desc": product.introduce || '', //string, 简介
                    "categories": _.map( _.filter( product.categoryList,{"enabled" : true}), adjustCategory )
                };
                function adjustCategory(category) {
                    var obj = {
                        "categoryId": category._id,
                        "code": category.code || '', //string, 编码
                        "name": category.name || '', 
                        "image": category.image || '', 
                        "picture": category.picture || '', 
                        "desc": category.introduce || '', 
                        "weighting": category.weight || null, 
                        "enabled": category.enabled || false,
                        "items": getItemList(category._id.toString() )
                    }
                    return obj;
                }
                // 获取项目类别下的检测项目
                function getItemList(cid) {
                    var itemList = _.filter(itemAll, function(item){
                        return (item.path[3].id == cid);
                    })
                    itemList = _.map(itemList,function(item){
                        var locusList = getLocusList(item._id.toString());
                        var literatureList = getItemLiteratures(locusList, item.literatureList);
                        var obj = {
                            itemId: item._id, 
                            name: item.name,
                            code: item.code,
                            introduce: item.introduce,
                            image: item.image,
                            picture: item.picture,
                            enabled: item.enabled,
                            icon: item.icon,
                            inReport: item.inReport,
                            // 权重
                            weight: item.weight,
                            // 算分标签
                            scoreTag: item.scoreTag,
                            propertyList: item.propertyList,
                            levelList: item.levelList,
                            literatureList: literatureList,
                            locusList: locusList
                        }
                        return obj;
                    })
                    return itemList;
                }
                // 根据项目查询下属基因位点
                function getLocusList(id) {
                    var locusArr = _.filter(locusAll, function(item){
                        if (item.inReport == true) return (item.path[4].id == id);
                    })
                    return locusArr;
                }
                // 获取项目的所有文献 （临时取所有下属位点的文献）
                function getItemLiteratureList(literatureListArr) {
                    var list = [];
                    literatureListArr.forEach(function(arr){
                        list = _.union(list,arr);
                    })
                    list = _.uniq(list);
                    return list;
                }
                // 获取项目当前需要显示的文献列表
                function getItemLiteratures(locusList, literatureListArr) {
                    var allList = [];
                    locusList.forEach(function(item){
                        allList = _.union(allList,item.literatureList);
                    });
                    allList = _.uniq(allList);
                    var mylist = _.filter(allList, function(item){
                        if (literatureListArr.indexOf(item._id.toString()) >= 0) return item;
                    });
                    return mylist;
                }
                
                fs.writeFileSync(`${productName}.json`, JSON.stringify(template,null,4));
                return reply('任务成功！');
                //console.log('任务成功！')
            } catch (error) {
                server.log('error',error);
                console.log({ success: false,info: error.message });
            }
            
        }
    },
    // 导入位点数据Excel表格
    {
        method: 'POST',
        path:'/locus-data-input', 
        handler: async function (request, reply) {
            var allowSuffixs = ['.xlsx'];
            var form = new multiparty.Form();
            try {
                form.parse(request.payload, function(err, fields, files) {
                    if(err){
                        return reply({success: false, error: err});
                    }
                    var originalFilename = files.file[0].originalFilename;
                    var path = require('path');
                    var suffix = path.extname(originalFilename) || '';
                    if(allowSuffixs.indexOf(suffix) > -1){
                        fs.readFile(files.file[0].path, function(err, data) {
                            //var fileName = files.file[0].originalFilename;
                            var fileName = originalFilename;//crypto.createHash('md5').update(data,'utf8').digest('hex') + '.' + suffix;
                            console.log(22,fileName);
                            fs.writeFile('./app/upload/' + fileName, data, function(err) {
                                if (err) {
                                    return reply(err);
                                }else{
                                    return reply({
                                        success: true, 
                                        data: {
                                            originalFilename: path.basename(originalFilename,suffix),
                                            fileUrl: ('./app/upload/' + fileName).substr(1)
                                        } 
                                    });
                                } 
                            });
                        });
                    }else{
                        return reply({success: false, error: '不允许的文件格式'});
                    }                    
                });
            } catch (error) {
                console.log(error);
                return reply({success: false, error});
            }
        },
        config: {
            payload: {
                maxBytes: 209715200,
                output: 'stream',
                parse: false
            },
        }
    },
])