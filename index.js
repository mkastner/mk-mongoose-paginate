'use strict';

/**
 * @package mongoose-paginate
 * @param {Object} [query={}]
 * @param {Object} [options={}]
 * @param {Object|String} [options.select]
 * @param {Object} [options.findOptions] - use for setting collation
 * @param {Object|String} [options.sort]
 * @param {Array|Object|String} [options.populate]
 * @param {Boolean} [options.lean=false]
 * @param {Boolean} [options.leanWithId=true]
 * @param {Number} [options.offset=0] - Use offset or page to set skip position
 * @param {Number} [options.page=1]
 * @param {Number} [options.limit=10]
 * @param {Function} [callback]
 * @returns {Promise}
 */

function paginate(query, options, callback) {

  let mongooseContext = this;

  return new Promise(async function (resolve, reject) {

    try {

      query = query || {};
      options = Object.assign({}, paginate.options, options);

      let
        findOptions = options.findOptions,
        select = options.select,
        sort = options.sort,
        populate = options.populate,
        lean = options.lean || false,
        leanWithId = options.leanWithId ? options.leanWithId : true,
        limit = options.limit ? options.limit : 10,
        page, offset, skip, promises;

      if (options.offset) {
        offset = options.offset;
        skip = offset;
      } else if (options.page) {
        page = options.page;
        skip = (page - 1) * limit;
      } else {
        page = 1;
        offset = 0;
        skip = offset;
      }

      if (limit) {
        let docsQuery = mongooseContext.find(query, {}, findOptions)
          .select(select)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(lean);
        if (populate) {
          [].concat(populate).forEach((item) => {
            docsQuery.populate(item);
          });
        }
        promises = {
          docs: docsQuery.exec(),
          count: mongooseContext.count(query).exec()
        };
        if (lean && leanWithId) {
          promises.docs = promises.docs.then((docs) => {
            docs.forEach((doc) => {
              doc.id = String(doc._id);
            });
            return docs;
          });
        }
      }

      let result = {limit: limit};

      for (let key in promises) {
        result[key] = await promises[key];
      }

      if (offset !== undefined) {
        result.offset = offset;
      }
      if (page !== undefined) {
        result.page = page;
        result.pages = Math.ceil(result.count / limit) || 1;
      }
      if (typeof callback === 'function') {
        return callback(null, result);
      }

      resolve(result);

    } catch (err) {
      console.error(err);
    }
  }).catch(function(err) {
    console.error(err);
  });
}

/**
 * @param {Schema} schema
 */

module.exports = function(schema) {
  schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;
