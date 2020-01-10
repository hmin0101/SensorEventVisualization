const db = require('../db/db_query');

module.exports = {

    /* Device List */
    getDeviceList: async function() {
        try {
            const selectQ = 'select * from device';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    /* Sensor List */
    getSensorList: async function() {
        try {
            const selectQ = 'select * from sensors';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getUserDetectionByDevice: async function(deviceId) {
        try {
            const sensorSelectQ = 'select group_concat(b.sensors_id) as sensors from device as a inner join sensors as b on a.device_id=b.device_id where a.device_id='+deviceId+';';
            const sensorSelectResult = await db.asyncSelect(sensorSelectQ);
            if (sensorSelectResult.result) {
                const sensors = sensorSelectResult.message[0].sensors;
                const detectionSelectQ = 'select a.sensors_id, a.name, group_concat(b.user_detection_id) as userDetectionList, group_concat(b.time) as times ' +
                    'from sensors as a inner join user_detection as b on a.sensors_id=b.sensors_id where a.sensors_id in ('+sensors+') group by a.sensors_id;';
                return await db.asyncSelect(detectionSelectQ);
            } else {
                return {result: false, message: []};
            }
        } catch (err) {
            return err;
        }
    },

    getUserDetectionBySensor: async function(sensorsId) {
        try {
            const selectQ = 'select user_detection_id, time from user_detection where sensors_id='+sensorsId+';';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getObjectPickupByDevice: async function(deviceId) {
        try {
            const sensorSelectQ = 'select group_concat(b.sensors_id) as sensors from device as a inner join sensors as b on a.device_id=b.device_id where a.device_id='+deviceId+';';
            const sensorSelectResult = await db.asyncSelect(sensorSelectQ);
            if (sensorSelectResult.result) {
                const sensors = sensorSelectResult.message[0].sensors;
                const detectionSelectQ = 'select a.sensors_id, a.name, group_concat(b.object_pickup_id) as objectPickupList, group_concat(b.time) as times from sensors as a left join object_pickup as b on a.sensors_id=b.sensors_id where a.sensors_id in ('+sensors+') group by a.sensors_id;';
                return await db.asyncSelect(detectionSelectQ);
            } else {
                return {result: false, message: []};
            }
        } catch (err) {
            return err;
        }
    },

    getObjectPickupBySensor: async function(sensorsId) {
        try {
            const selectQ = 'select object_pickup_id, time from object_pickup where sensors_id='+sensorsId+';';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getAdvertisementData: async function(deviceId) {
        try {
            const selectQ = 'select * from advertisement where device_id='+deviceId+';';
            return await db.asyncSelect(selectQ);
        } catch (err) {
            return err;
        }
    },

    getStayEventBySensor: async function(sensorId) {
        try {
            const selectStayTimeQ = 'select a.name, group_concat(b.time) as times, group_concat(c.duration) as stayTime from sensors as a ' +
                'left join user_detection as b on a.sensors_id=b.sensors_id inner join user_detection_duration as c on b.user_detection_id=c.user_detection_id where a.sensors_id='+sensorId+' group by a.sensors_id;';
            return await db.asyncSelect(selectStayTimeQ);
        } catch (err) {
            return err;
        }
    },

    setInvisibleAdvertisement: async function(sensorsId) {
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

    getPopupSetting: async function(deviceId) {
        try {
            const selectQ = 'select * from advertisement_setting where device_id='+deviceId+';';
            return await db.asyncQuery(selectQ);
        } catch (err) {
            return err;
        }
    },

    addPopupSetting: async function(deviceId, option) {
        try {
            const insertQ = 'insert into advertisement_setting (device_id, advertisement_setting.key, url, x_axis, y_axis, width, height, duration, visible) value ' +
                '('+deviceId+', "'+option.name+'", "'+option.url+'", '+option.pos_x+', '+option.pos_y+', '+option.width+', '+option.height+', '+option.duration+', 1)';
            return await db.query(insertQ);
        } catch (err) {
            return err;
        }
    },

    updatePopupSetting: async function(deviceId, option) {
        try {
            const selectQ = 'select group_concat(advertisement_setting_id) as ids from advertisement_setting where device_id='+deviceId+' and visible=1 group by device_id;';
            const selectResult = await db.query(selectQ);
            if (selectResult.result) {
                for (const elem of selectResult.message) {
                    elem.adver
                }
            }

            const insertQ = 'update advertisement_setting set advertisement_setting.key="'+option.name+'", url="'+option.url+'", x_axis='+option.pos_x+', y_axis='+option.pos_y+', ' +
                'width='+option.width+', height='+option.height+', duration='+option.duration+' where advertisement_setting_id='+option.id+';';
            return await db.query(insertQ);
        } catch (err) {
            return err;
        }
    },

    deletePopupSetting: async function(settingId) {
        try {
            const deleteQ = 'delete from advertisement_setting where advertisement_setting_id='+settingId+';';
            return await db.query(deleteQ);
        } catch (err) {
            return err;
        }
    },

};