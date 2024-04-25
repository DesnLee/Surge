const base_result = { title: "Surge Licenses" };
const failed_result = { icon: "xmark.seal.fill", color: "#f55858" };
const succeed_result = { icon: "checkmark.seal.fill", color: "#50d763" };

// 提取参数
const args = $argument.split("&").reduce((acc, cur) => {
  const [key, value] = cur.split("=");
  acc[key] = value;
  return acc;
}, {});
const licenses = args.LICENSES.split("|");
const hideEmail = args.HIDE_EMAIL === "true";

const types = {
  ios: "surge-ios",
  mac: "surge-mac",
  mac3: "surge-mac-3",
};

// 获取 LICENSE 信息
const check = ({ email, key, type }) =>
  new Promise((resolve, reject) => {
    const url = `https://nssurge.com/api/account/management?email=${encodeURIComponent(email)}&key=${key}&type=${types[type]}`;
    $httpClient.get(url, (error, response, d) => {
      if (error) {
        console.error(error);
        reject(`${email}\n获取 LICENSE 信息失败`);
      }
      if (response.status !== 200) {
        console.error(`HTTP code ${response.status}`);
        reject(`${email}\n获取 LICENSE 信息失败`);
      }

      data = JSON.parse(d);
      const matches = data.license.match(/^surge (.*) license.*\((.*)\)$/i);
      const title = `${matches[1]} - ${matches[2]}`;
      const emailStr = hideEmail ? "" : `\nEmail: ${email}`;
      let content = `${title}${emailStr}\n\n`;
      for (const device of data.devices) {
        content += ` > ${device.deviceName}\n`;
      }
      resolve(content);
    });
  });

!(() => {
  let allFailed = true;
  let content = "";

  // 检查参数
  if (!licenses || !licenses.length) {
    content = "无 LICENSE 配置";
    $done({ ...base_result, ...failed_result, content });
  }

  // 解析
  const reqs = licenses.map((license, index) => {
    const [email, key, type] = license.split(":");
    if (!email || !key || !type) {
      return {
        ok: false,
        msg: `第 ${index + 1} 个（${email}） LICENSE 参数缺失`,
      };
    } else if (!types[type]) {
      return {
        ok: false,
        msg: `第 ${index + 1} 个（${email}） LICENSE 类型错误`,
      };
    }

    return check({ email, key, type });
  });

  // 执行
  Promise.allSettled(reqs).then((results) => {
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        allFailed = false;
        content += result.value;
      } else {
        content += result.reason;
      }
      if (index !== results.length - 1) content += "----------\n\n";
    });

    allFailed
      ? $done({ ...base_result, ...failed_result, content })
      : $done({ ...base_result, ...succeed_result, content });
  });
})();
