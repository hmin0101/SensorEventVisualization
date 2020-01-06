const db = require('../db/db_query');

module.exports = {

    getSensorsInfo: async function() {
        try {
            const selectQ = 'select * from sensors';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getUserDetectionOfAll: async function() {
        try {
            const selectQ = 'select a.sensors_id, group_concat(b.user_detection_id) as userDetectionList, group_concat(b.time) as times from sensors as a inner join user_detection as b on a.sensors_id=b.sensors_id group by a.sensors_id;';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getUserDetection: async function(sensorsId) {
        try {
            const selectQ = 'select user_detection_id, time from user_detection where sensors_id='+sensorsId+';';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getUserDetectionDetail: async function(sensorsId) {
        try {
            const selectQ = 'select a.user_detection_id, a.time, b.duration from user_detection as a inner join user_detection_duration as b on a.user_detection_id=b.user_detection_id where a.sensors_id='+sensorsId+';';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getObjectPickup: async function(sensorsId) {
        try {
            const selectQ = 'select object_pickup_id, time from object_pickup where sensors_id='+sensorsId+';';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getObjectPickupDetail: async function(sensorsId) {
        try {
            const selectQ = 'select a.object_pickup_id, a.time, b.duration from object_pickup as a left join object_pickup_duration as b on a.object_pickup_id=b.object_pickup_id where a.sensors_id='+sensorsId+';';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getAdvertisementData: async function() {
        try {
            const selectQ = 'select * from advertisement';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getDuration: async function() {                 // 센서 별 User Detection Duration Data 를 DB 에서 가져옴
        try {
            const selectQ = 'select a.sensors_id, group_concat(a.time) as times, group_concat(b.duration) as durations ' +
                'from user_detection as a inner join user_detection_duration as b on a.user_detection_id=b.user_detection_id group by a.sensors_id;';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getSettingAdvertisementList: async function(sensorsId) {
        try {
            const selectQ = 'select * from advertisement_setting where sensors_id='+sensorsId+';';
            return await db.query(selectQ);
        } catch (err) {
            return err;
        }
    },

    getSettingAdvertisement: async function(settingId) {
        try {
            const selectQ = 'select * from advertisement_setting where advertisement_setting_id='+settingId+';';
            return await db.query(selectQ);
        } catch (err) {
            return err;
        }
    },

    searchSettingAdvertisement: async function(sensorsId, settingKey) {
        try {
            const selectQ = 'select count(*) as cnt from advertisement_setting where sensors_id='+sensorsId+' and advertisement_setting.key="'+settingKey+'";';
            return await db.query(selectQ);
        } catch (err) {
            return err;
        }
    },

    // deleteSettingAdvertisement: async function(sensorsId, settingName) {
    //     try {
    //         const selectQ = 'select count(*) as cnt from advertisement_setting where name="'+settingName+'" and sensors_id='+sensorsId+';';
    //         return await db.query(selectQ);
    //     } catch (err) {
    //         return err;
    //     }
    // },

    addSettingAdvertisement: async function(info) {
        try {
            const insertQ = 'insert into advertisement_setting (sensors_id, advertisement_setting.key, url, x_axis, y_axis, width, height, duration, visible) value ' +
                '('+info.sensorId+', "'+info.key+'", "'+info.url+'", '+info.xAxis+', '+info.yAxis+', '+info.width+', '+info.height+', '+info.duration+', 1)';
            return await db.query(insertQ);
        } catch (err) {
            return err;
        }
    },

    setInvisibleAdvertisement: async function(sensorsId) {
        console.log(sensorsId);
        try {
            const selectQ = 'select advertisement_setting_id from advertisement_setting where sensors_id='+sensorsId+';';
            const selectResult =  await db.query(selectQ);
            if (selectResult.result) {
                const size = selectResult.message.length;
                const list = selectResult.message.map(function(elem) {
                    return elem.advertisement_setting_id;
                });

                if (selectResult.message.length > 0) {

                    let cnt = 0;
                    for (id of list) {
                        const updateQ = 'update advertisement_setting set visible=0 where advertisement_setting_id=' + id + ';';
                        const updateResult = await db.query(updateQ);
                        if (updateResult.result) {
                            cnt++;
                        } else {
                            return {result: false, message: "Update Error"};
                        }

                        if (cnt === size) {
                            return {result: true, message: "Update Complete"};
                        }
                    }
                    return {result: false, message: "Error"};
                } else {
                    return {result: true};
                }
            } else {
                return {result: false, message: "Select Error"};
            }
        } catch (err) {
            return err;
        }
    },

    setVisibleAdvertisement: async function(settingId) {
        try {
            const updateQ = 'update advertisement_setting set visible=1 where advertisement_setting_id='+settingId+';';
            const updateResult =  await db.query(updateQ);
            if (updateResult.result) {
                return {result: true, message: "Update Complete"};
            } else {
                return {result: false, message: "Update Error"};
            }
        } catch (err) {
            return err;
        }
    },

};