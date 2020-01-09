var express = require('express');
var router = express.Router();
//db
const query = require('../model/query');

const convert  = require('../public/javascripts/custom-convert');

let CUR_POS = 0;

/* 데이터베이스로부터 디바이스 목록과 각 디바이스에 연결된 센서들의 정보를 가져옴 */
let deviceList = [];
(async function getDeviceList() {
    const result = await query.getDeviceList();
    if (result.result) {
        deviceList = result.message.map(function(elem) {
            return {
                id: elem.device_id,
                name: elem.name,
                sensors: []
            }
        });

        // 각 디바이스별 센서 목록
        const selectResult = await query.getSensorList();
        if (selectResult.result) {
            for (const sensor of selectResult.message) {
                let idx = 0;
                for (const device of deviceList) {
                    if (device.id === sensor.device_id) {
                        deviceList[idx].sensors.push({
                            id: sensor.sensors_id,
                            name: sensor.name
                        });
                        break;
                    }
                    idx++;
                }
            }
        }
    }
})();

/* Main 접속 시, /m1 으로 redirect */
router.get('/', function(req, res, next) {
  res.redirect('/sensor/1');
});

/*
 * 디바이스 선택에 따라서 디바이스에 연결된 센서들의 이벤트 데이터를 데이터베이스로부터 읽어와 그래프에 사용하기 위한 데이터로 변환
 */
router.post('/choice/device', async function(req, res) {
    const type = req.body.type;
    const deviceId = req.body.id;

    let index = 0;
    for (const device of deviceList) {
        if (Number(deviceId) === Number(device.id))
            CUR_POS = index;
        index++;
    }

    switch (type) {
        case "access":
            const accessEventData = await getAccessEventDataByDevice(deviceList[CUR_POS].id);
            await res.json({result: true, accessEventData: accessEventData});
            break;
        case "pickup":
            const pickupEventData = await getPickupEventDataByDevice(deviceList[CUR_POS].id);
            await res.json({result: true, pickupEventData: pickupEventData});
            break;
        case "stay":
            const sensorId = req.body.sensorId;
            const stayEventData = await getStayEventDataBySensor(sensorId);
            await res.json({result: true, stayEventData: stayEventData});
            break;
        case "setting":
            const list = await getPopupList(deviceList[CUR_POS].id);
            await res.json({result: true, list: list});
            break;
        default:
            await res.json({result: false, message: "Type Error"});
            break;
    }
});

/* ACCESS_EVENT */
router.get('/event/access', async function(req, res) {
    const accessEventData = await getAccessEventDataByDevice(deviceList[CUR_POS].id);
    res.render('event_access', {currentMenu: "access", deviceList: deviceList, pos: CUR_POS, accessEventData: JSON.stringify(accessEventData)});
});

/* PICKUP_EVENT */
router.get('/event/pickup', async function(req, res) {
    const pickupEventData = await getPickupEventDataByDevice(deviceList[CUR_POS].id);
    res.render('event_pickup', {currentMenu: "pickup", deviceList: deviceList, pos: CUR_POS, pickupEventData: JSON.stringify(pickupEventData)});
});

/* STAY_EVENT */
router.get('/event/stay', async function(req, res) {
    const stayEventData = await getStayEventDataBySensor(9);
    res.render('event_stay', {currentMenu: "stay", deviceList: deviceList, pos: CUR_POS, stayEventData: JSON.stringify(stayEventData)});
});

/* ACCESS_EVENT */
router.post('/sensor/list', function(req, res) {
    const deviceId = req.body.deviceId;

    let sensorList = [];
    for (const device of deviceList) {
        if (Number(device.id) === Number(deviceId)) {
            sensorList = device.sensors;
        }
    }
    res.json({result: true, sensorList: sensorList});
});

/* 디바이스의 각 센서별 이벤트 데이터 시각화 */
router.get('/sensor/:id', async function(req, res) {
    const sensorIndex = Number(req.params.id);
    const udOption = await getUserDetectionInDisplayStand(deviceList[CUR_POS].sensors[sensorIndex-1].id);         // Sensor 에 대한 사용자 감지 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    const opOption = await getObjectPickupInDisplayStand(deviceList[CUR_POS].sensors[sensorIndex-1].id);          // Sensor 에 대한 물건 픽업 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    res.render('event-by-sensor', {currentMenu: "detail", sensorIndex: sensorIndex, deviceList: deviceList, pos: CUR_POS, userDetectionSerial: JSON.stringify(udOption), objectPickupSerial: JSON.stringify(opOption)});    // Sensor 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
});

/* SETTING */
router.get('/setting', async function(req, res) {
    res.render('setting', {currentMenu: "setting", deviceList: deviceList, pos: CUR_POS});    // Sensor 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
});

/* SELECT SETTING */
router.get('/setting/popup/list', async function(req, res) {
    const result = await getPopupList(deviceList[CUR_POS].id);
    await res.json(result);
});

async function getPopupList(deviceId) {
    const result = await query.getPopupSetting(deviceId);
    if (result.result) {
        return await result.message.map(function(elem) {
            return {
                id: elem.advertisement_setting_id,
                name: elem.key,
                url: elem.url,
                pos_x: elem.x_axis,
                pos_y: elem.y_axis,
                width: elem.width,
                height: elem.height,
                duration: elem.duration,
                type: elem.type,
            }
        });
    } else {
        return [];
    }
}

/* ADD SETTING */
router.post('/setting/popup/add', async function(req, res) {
    const option = JSON.parse(req.body.option);
    const result = await query.addPopupSetting(deviceList[CUR_POS].id, option);
    await res.json(result);
});

/* UPDATE SETTING */
router.post('/setting/popup/update', async function(req, res) {
    const option = JSON.parse(req.body.option);
    const result = await query.updatePopupSetting(deviceList[CUR_POS].id, option);
    await res.json(result);
});

/* DELETE SETTING */
router.post('/setting/popup/delete', async function(req, res) {
    res.render('setting', {currentMenu: "setting", deviceList: deviceList, pos: CUR_POS});    // Sensor 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
});

/* Sensor1 의 Event Data 를 시각화하여 보여주는 Page */
router.get('/m1', async function(req, res) {
    const udOption = await getUserDetectionInDisplayStand(deviceList[CUR_POS].sensors[0].id);         // Sensor 1 에 대한 사용자 감지 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    const opOption = await getObjectPickupInDisplayStand(deviceList[CUR_POS].sensors[0].id);          // Sensor 1 에 대한 물건 픽업 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    res.render('m1', {deviceList: deviceList, pos: CUR_POS, userDetectionSerial: JSON.stringify(udOption), objectPickupSerial: JSON.stringify(opOption)});    // Sensor 1 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m1.ejs 를 표출 )
});

/* Sensor2 의 Event Data 를 시각화하여 보여주는 Page */
router.get('/m2', async function(req, res) {
    const udOption = await getUserDetectionInDisplayStand(deviceList[CUR_POS].sensors[1].id);         // Sensor 2 에 대한 사용자 감지 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    const opOption = await getObjectPickupInDisplayStand(deviceList[CUR_POS].sensors[1].id);          // Sensor 2 에 대한 물건 픽업 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    res.render('m2', {deviceList: deviceList, pos: CUR_POS, userDetectionSerial: JSON.stringify(udOption), objectPickupSerial: JSON.stringify(opOption)});    // Sensor 2 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m2.ejs 를 표출 )
});

/* Sensor3 의 Event Data 를 시각화하여 보여주는 Page */
router.get('/m3', async function(req, res) {
    const udOption = await getUserDetectionInDisplayStand(deviceList[CUR_POS].sensors[2].id);         // Sensor 3 에 대한 사용자 감지 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    const opOption = await getObjectPickupInDisplayStand(deviceList[CUR_POS].sensors[2].id);          // Sensor 3 에 대한 물건 픽업 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    res.render('m3', {deviceList: deviceList, pos: CUR_POS, userDetectionSerial: JSON.stringify(udOption), objectPickupSerial: JSON.stringify(opOption)});    // Sensor 3 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m3.ejs 를 표출 )
});

/* Sensor4 의 Event Data 를 시각화하여 보여주는 Page */
router.get('/m4', async function(req, res) {
    const udOption = await getUserDetectionInDisplayStand(deviceList[CUR_POS].sensors[3].id);         // Sensor 4 에 대한 사용자 감지 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    const opOption = await getObjectPickupInDisplayStand(deviceList[CUR_POS].sensors[3].id);          // Sensor 4 에 대한 물건 픽업 이벤트를 가져오고 Chart 에서 사용할 수 있도록 처리
    res.render('m4', {deviceList: deviceList, pos: CUR_POS, userDetectionSerial: JSON.stringify(udOption), objectPickupSerial: JSON.stringify(opOption)});    // Sensor 4 에 각 이벤트 데이터를 파라미터로 넘겨줌 ( m4.ejs 를 표출 )
});

/* 시간 대별 사용자 감지 이벤트의 지속시간을 시각화하여 보여주는 Page */
router.get('/stayTime', async function(req, res) {
    const stayTime = await getUserStayTime(deviceList[CUR_POS].id);
    res.render('stayTime', {deviceList: deviceList, pos: CUR_POS, durationData: JSON.stringify(stayTime)});
});

/* 시간대별 이벤트 팝업 표출 횟수를 시각화하여 보여주는 Page */
router.get('/advertise', async function(req, res) {
    const adOption = await getAdvertisementCount(deviceList[CUR_POS].id);                                     // DB에서 시간대별 이벤트 표출 횟수를 가져와 echart에서 사용할 수 있도록 가공
    res.render('advertise', {currentMenu: "advertise", deviceList: deviceList, pos: CUR_POS, advertisementSerial: JSON.stringify(adOption)});           // echart 에서 사용할 가공한 데이터를 파라미터로 넘겨줌 ( advertise.ejs 를 표출)
});

/* 모든 센서의 사용자 감지 이벤트에 대한 정보를 시각화하여 보여주는 Page */
router.get('/punch', async function(req, res) {
    const result = await query.getObjectPickupByDevice(deviceList[CUR_POS].id);                                 // DB 에서부터 모든 센서들의 사용자 감지 이벤트 데이터를 가져옴
    if (result.result) {
        const convertedData = await convert.comparisionByDisplayStand(deviceList[CUR_POS].sensors, result.message);          // echart 에서 사용하기 위해 시간대별로 데이터를 가공
        res.render('punchChart', {displayData: JSON.stringify(convertedData)});         // echart 에서 사용할 가공한 데이터를 파라미터로 넘겨줌 ( punchChart.ejs 를 표출)
    } else {
        res.render('punchChart', {displayData: []});                                    // Query Error 일 경우, 빈 데이터를 넘겨줌 ( punchChart.ejs 를 표출)
    }
});

// /* 각 센서별 이벤트 팝업을 등록하고 설정하는 Page */
// router.get('/setting', async function(req, res) {
//
//     let advertisementSettingList = [];
//
//     if (sensorList.length > 0) {
//         const result = await query.getSettingAdvertisementList(sensorList[0].sensorsId);            // DB에서 Sensor 1 에 등록된 팝업을 가져옴
//         if (result.result) {
//             advertisementSettingList = result.message.map(function(elem) {                          // 데이터 가공
//                 return {
//                     advertisementSettingId: elem.advertisement_setting_id,
//                     key: elem.key,
//                     url: elem.url,
//                     xAxis: elem.x_axis,
//                     yAxis: elem.y_axis,
//                     width: elem.width,
//                     height: elem.height,
//                     duration: elem.duration,
//                 }
//             });
//         }
//         res.render('setting', {sensorList: sensorList, advertisementSettingList: advertisementSettingList});            // Sensor List 와 팝업 List 를 파라미터로 넘겨줌 ( setting.ejs 표출 )
//     } else {
//         res.render('setting', {sensorList: [], advertisementSettingList: advertisementSettingList});            // Query Error 일 경우, 빈 데이터를 넘겨줌 ( setting.ejs 를 표출)
//     }
// });

/* 팝업 설정 Page 에서 센서를 선택할 경우, 해당 센서에 등록된 팝업 목록을 가져오는 API */
router.get('/setting/:sensorId', async function(req, res) {

    const sensorId = req.params.sensorId;           // 가져올 Sensor Id

    const result = await query.getSettingAdvertisementList(sensorId);           // DB 에서 해당 Sensor Id 에 등록된 팝업 목록을 가져옴
    if (result.result) {
        if (result.message.length > 0) {
            const list = result.message.map(function(elem) {                    // 데이터 가공
                return {
                    advertisementSettingId: elem.advertisement_setting_id,
                    key: elem.key,
                    url: elem.url,
                    xAxis: elem.x_axis,
                    yAxis: elem.y_axis,
                    width: elem.width,
                    height: elem.height,
                    duration: elem.duration,
                }
            });
            await res.json(list);                                               // 가공된 데이터 ( JSON 형식 ) 반환
        } else {
            await res.json([]);
        }
    } else {
        await res.json([]);
    }

});

/* 센서별로 등록된 팝업을 이벤트 발생 시, 호출되도록 설정하는 API */
router.get('/popup/info/:settingId', async function(req, res) {
    const settingId = req.params.settingId;                                     // 요청할 팝업 ID

    const result = await query.getSettingAdvertisement(settingId);              // DB 에서 팝업 ID 에 해당하는 팝업 정보를 가져옴
    if (result.result) {
        let deviceName = '';
        const sensorId = result.message[0].sensors_id;
        if (Number(sensorId) === 5) {
            deviceName = 't1';
        } else if (Number(sensorId) === 6) {
            deviceName = 't2';
        } else if (Number(sensorId) === 7) {
            deviceName = 't3';
        } else {
            deviceName = 't4';
        }

        const info = {                                                          // 디바이스에 DB 에서 가져온 팝업 데이터를 송신
            deviceName: deviceName,
            url: 'http://13.209.63.0:9000/images/'+result.message[0].url,
            offsetX: result.message[0].x_axis,
            offsetY: result.message[0].y_axis,
            width: result.message[0].width,
            height: result.message[0].height,
            duration: result.message[0].duration
        };
        const updateResult = await query.setInvisibleAdvertisement(sensorId);   // 이벤트 발생 시, 해당 팝업이 표출되도록 변경된 사항을 DB 에서 변경
        if (updateResult.result) {
            const up = await query.setVisibleAdvertisement(settingId);          // DB 에 저장된 해당 팝업의 설정을 업데이트
            if (up.result) {
                await res.json({result: true, settingId: settingId});           // result True
            } else {
                await res.json({result: false, message: "Update error 2"});     // result False
            }
        } else {
            await res.json({result: false, message: "Update error"});           // result False
        }
    } else {
        await res.json({result: false, message: "Select error"});               // result False
    }
});

/* 새로운 이벤트 팝업 등록하기 위한 API */
router.post('/setting', async function(req, res) {
    const info = JSON.parse(req.body.info);                                     // 새로 등록하기 위한 팝업 설정을 가져옴
    const searchResult = await query.searchSettingAdvertisement(info.sensorId, info.key);           // DB에 센서 별로 등록된 팝업 Key 중 현재 등록하기 위한 팝업 Key 가 중복되는지 여부 판단
    if (searchResult.result) {
        if (searchResult.message[0].cnt > 0) {
            await res.json({result: false, message: "같은 key가 존재합니다."});     // Key 가 중복될 경우, return False
        } else {
            const updateResult = await query.setInvisibleAdvertisement(info.sensorId);          // 팝업을 등록할 센서에 등록된 이벤트 팝업들의 visible option 을 모두 false 로 변경
            if (updateResult.result) {
                const result = await query.addSettingAdvertisement(info);       // 새로운 팝업을 등록
                if (result.result) {
                    await res.json({result: true, message: "설정 추가 완료"});
                } else {
                    await res.json({result: false, message: "Insert error"});
                }
            } else {
                await res.json(updateResult);
            }
        }
    } else {
        await res.json({result: false, message: "Select error"});
    }
});

/* 단말별 ACCESS EVENT 데이터 */
async function getAccessEventDataByDevice(deviceId) {
    const selectAccessEventResult = await query.getUserDetectionByDevice(deviceId);
    if (selectAccessEventResult.result) {
        const sensorListInDevice = selectAccessEventResult.message.map(function(elem) {
            return {
                sensorId: elem.sensors_id,
                name: elem.name,
                times: elem.times
            }
        });

        const resultDataList = [];
        for (const sensorData of sensorListInDevice) {
            if (sensorData.times === null) {
                const result = await convert.convertArrayToTimeData([]);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            } else {
                const timeList = sensorData.times.split(",");
                const result = await convert.convertArrayToTimeData(timeList);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            }
        }

        return await convert.convertDataToChartData(resultDataList, "line");
    } else {
        return [];
    }
}

/* 단말별 PICKUP EVENT 데이터 */
async function getPickupEventDataByDevice(deviceId) {
    const selectPickupEventResult = await query.getObjectPickupByDevice(deviceId);
    if (selectPickupEventResult.result) {
        const sensorListInDevice = selectPickupEventResult.message.map(function(elem) {
            return {
                sensorId: elem.sensors_id,
                name: elem.name,
                times: elem.times
            }
        });

        const resultDataList = [];
        for (const sensorData of sensorListInDevice) {
            if (sensorData.times === null) {
                const result = await convert.convertArrayToTimeData([]);
                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            } else {
                const timeList = sensorData.times.split(",");
                const result = await convert.convertArrayToTimeData(timeList);

                resultDataList.push({
                    name: sensorData.name,
                    data: result
                });
            }
        }

        return await convert.convertDataToChartData(resultDataList, "line");
    } else {
        return [];
    }
}

/* 데이터베이스에서 요청 받은 디바이스에 대한 사용자 감지시간(Duration) 데이터를 가져와 그래프에서 사용할 수 있도록 가공하여 반환하는 함수 */
async function getStayEventDataBySensor(sensorId) {
    const selectStayEventResult = await query.getStayEventBySensor(sensorId);           // 사용자가 센서 앞에서 얼마나 머물렀는지를 알 수 있는 Duration 값을 DB 에서 가져옴
    if (selectStayEventResult.result) {
        const convertedData = await convert.convertStayTimeArrayToTimeData(selectStayEventResult.message[0]);             // Duration Data 를 시각화하기 위해 이벤트 발생 시간을 기준으로 데이터 가공
        const resultDataList = [{
            name: selectStayEventResult.message[0].name,
            data: convertedData
        }];

        const chartDataList = await convert.convertDataToChartData(resultDataList, "boxplot");
        return chartDataList[0];
    } else {
        return [];
    }
}

/* 데이터베이스에서 요청 받은 SensorID에 대한 사용자 감지 이벤트 데이터를 가져와 그래프에서 사용할 수 있도록 변환하여 반환하는 함수 */
async function getUserDetectionInDisplayStand(sensorsId) {
    let userDetectionEvent;

    if (sensorsId < 0) {
        return [];
    } else {
        const userDetectionResult = await query.getUserDetectionBySensor(sensorsId);            // DB 에 저장된 Sensor ID를 가진 센서의 사용자 감지 이벤트 데이터를 가져옴
        if (userDetectionResult.result) {
            const list = userDetectionResult.message.map(function (elem) {              // 데이터 가공
                return {
                    userDetectionId: elem.user_detection_id,
                    time: elem.time,
                }
            });

            if (list.length > 0) userDetectionEvent = list;
            else userDetectionEvent = [];
        } else {
            userDetectionEvent = [];
        }
        return await convert.mConvertOptionSerial(userDetectionEvent);          // echart로 그래프를 그리기 위해서 List를 시간대별로 묶어서 가공
    }
}

/* 데이터베이스에서 요청 받은 SensorID에 대한 물건 픽업 이벤트 데이터를 가져와 그래프에서 사용할 수 있도록 변환하여 반환하는 함수 */
async function getObjectPickupInDisplayStand(sensorsId) {
    let objectPickupEvent;

    if (sensorsId < 0) {
        return [];
    } else {
        const objectPickupResult = await query.getObjectPickupBySensor(sensorsId);          // DB 에 저장된 Sensor ID를 가진 센서의 물건 픽업 이벤트 데이터를 가져옴
        if (objectPickupResult.result) {
            const list = objectPickupResult.message.map(function (elem) {           // 데이터 가공
                return {
                    objectPickupId: elem.object_pickup_id,
                    time: elem.time,
                }
            });

            if (list.length > 0) objectPickupEvent = list;
            else objectPickupEvent = [];
        } else {
            objectPickupEvent = [];
        }
        return await convert.mConvertOptionSerial(objectPickupEvent);          // echart로 그래프를 그리기 위해서 List를 시간대별로 묶어서 가공
    }
}

/* 데이터베이스에서 요청 받은 디바이스에 대한 사용자 감지시간(Duration) 데이터를 가져와 그래프에서 사용할 수 있도록 가공하여 반환하는 함수 */
async function getUserStayTime(deviceId) {
    const selectStayEventResult = await query.getDuration(deviceId);           // 사용자가 센서 앞에서 얼마나 머물렀는지를 알 수 있는 Duration 값을 DB 에서 가져옴
    if (selectStayEventResult.result) {
        return await convert.hourlyAnalysis(selectStayEventResult.message);             // Duration Data 를 시각화하기 위해 이벤트 발생 시간을 기준으로 데이터 가공
    } else {
        return [];
    }
}

/* 데이터베이스에서 요청 받은 디바이스에 대한 Popup 표출 횟수 데이터를 가져와 그래프에서 사용할 수 있도록 가공하여 반환하는 함수  */
async function getAdvertisementCount(deviceId) {
    let advertisementCount;

    const advertisementResult = await query.getAdvertisementData(deviceId);         // DB 에서 팝업 표출 횟수를 가져옴
    if (advertisementResult.result) {
        const list = advertisementResult.message.map(function (elem) {      // 데이터를 가공하여 List 를 생성
            return {
                advertisementId: elem.advertisement_id,
                time: elem.time,
            }
        });

        if (list.length > 0) advertisementCount = list;
        else advertisementCount = [];
    } else {
        advertisementCount = [];
    }
    return await convert.mConvertOptionSerial(advertisementCount);              // echart로 그래프를 그리기 위해서 List를 시간대별로 묶어서 가공
}

module.exports = router;
