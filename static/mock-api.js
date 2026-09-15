(function () {
  'use strict';

  // ── Storage helpers ──
  const DB_KEY = 'river_monitoring_db';
  const SESSION_KEY = 'river_monitoring_session';

  function getDB() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || seedDB();
    } catch (e) {
      return seedDB();
    }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  function saveSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }

  // ── Seed data ──
  function seedDB() {
    const now = Date.now();
    const db = {
      users: [
        { id: 1, username: 'admin', email: 'admin@river.com', password: 'admin123', role: 'admin', avatar: '', analysis_count: 42, warning_count: 0, created_at: '2025-06-01T10:00:00' },
        { id: 2, username: '李元浩', email: 'lyh@qq.com', password: '123456', role: 'user', avatar: '', analysis_count: 17, warning_count: 1, created_at: '2025-08-15T14:30:00' },
        { id: 3, username: 'bobo', email: 'bobo@qq.com', password: '123456', role: 'user', avatar: '', analysis_count: 7, warning_count: 0, created_at: '2025-09-01T09:00:00' },
        { id: 4, username: 'LMQ', email: 'lmq@qq.com', password: '123456', role: 'user', avatar: '', analysis_count: 3, warning_count: 0, created_at: '2025-09-10T16:20:00' },
        { id: 5, username: 'testuser', email: 'test@qq.com', password: '123456', role: 'user', avatar: '', analysis_count: 0, warning_count: 0, created_at: '2025-09-20T11:00:00' },
      ],
      feedbacks: [
        { id: 1, user_id: 2, username: '李元浩', location: '长江武汉段', pollution_level: '中度', content: '江边有大量白色泡沫，疑似工业废水排放。', status: '已核实', admin_note: '已通知环保部门处理', created_at: '2025-09-10T14:30:00', likes_count: 12, image_path: '', urgent_contact_admin: false },
        { id: 2, user_id: 3, username: 'bobo', location: '黄河兰州段', pollution_level: '轻度', content: '河水略带浑浊，上游可能有施工影响。', status: '待核实', admin_note: '', created_at: '2025-09-12T09:15:00', likes_count: 5, image_path: '', urgent_contact_admin: false },
        { id: 3, user_id: 4, username: 'LMQ', location: '珠江广州段', pollution_level: '重度', content: '河面漂浮大量垃圾，气味刺鼻，急需处理！', status: '已核实', admin_note: '已派清洁队前往', created_at: '2025-09-14T16:00:00', likes_count: 28, image_path: '', urgent_contact_admin: true },
        { id: 4, user_id: 2, username: '李元浩', location: '太湖无锡段', pollution_level: '轻微', content: '水质整体良好，仅局部有少量藻类。', status: '已核实', admin_note: '正常范围', created_at: '2025-09-15T10:30:00', likes_count: 3, image_path: '', urgent_contact_admin: false },
      ],
      analysis_results: [
        { id: 1, user_id: 2, username: '李元浩', result: JSON.stringify({ waterQuality: '轻度污染', pollutionLevel: '轻度', pollutionTypes: ['悬浮物'], transparency: '半透明', color: '偏绿', score: 68 }), analysis_time: '2025-09-12T14:30:00', image_path: '' },
        { id: 2, user_id: 3, username: 'bobo', result: JSON.stringify({ waterQuality: '良好', pollutionLevel: '无污染', pollutionTypes: [], transparency: '清澈', color: '正常', score: 88 }), analysis_time: '2025-09-13T10:00:00', image_path: '' },
        { id: 3, user_id: 2, username: '李元浩', result: JSON.stringify({ waterQuality: '中度污染', pollutionLevel: '中度', pollutionTypes: ['悬浮物', '油污'], transparency: '浑浊', color: '偏黑', score: 45 }), analysis_time: '2025-09-14T16:00:00', image_path: '' },
      ],
      account_feedbacks: [
        { id: 1, username: 'testuser', email: 'test@qq.com', reason: '账号无法登录，提示密码错误但确认密码正确', image_path: '', created_at: '2025-09-18T09:00:00', status: '待处理', admin_action: '', admin_note: '', handled_at: null },
      ],
      next_user_id: 6,
      next_feedback_id: 5,
      next_analysis_id: 4,
      next_account_feedback_id: 2,
    };
    saveDB(db);
    return db;
  }

  // ── Response helpers ──
  function jsonResponse(data, status) {
    return Promise.resolve(new Response(JSON.stringify(data), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  function okResponse(data) {
    return jsonResponse(data, 200);
  }

  function errorResponse(msg, status) {
    return jsonResponse({ error: msg }, status || 400);
  }

  function parseBody(options) {
    if (options && options.body) {
      try { return JSON.parse(options.body); } catch (e) { return {}; }
    }
    return {};
  }

  // ── Route handlers ──
  function handleApi(url, options) {
    const method = (options && options.method) || 'GET';
    const path = url.replace(/^.*?\/api\//, '/api/');
    const body = parseBody(options);
    const db = getDB();
    const session = getSession();

    // ── Auth ──
    if (path === '/api/login' && method === 'POST') {
      if (!body.username || !body.password) return errorResponse('请输入用户名和密码');
      const user = db.users.find(u => u.username === body.username && u.password === body.password);
      if (!user) return errorResponse('用户名或密码错误');
      const s = { user_id: user.id, username: user.username, role: user.role };
      saveSession(s);
      return okResponse({ message: '登录成功', is_admin: user.role === 'admin' });
    }

    if (path === '/api/register' && method === 'POST') {
      if (!body.username || !body.password) return errorResponse('请填写完整信息');
      if (db.users.find(u => u.username === body.username)) return errorResponse('用户名已存在');
      const user = {
        id: db.next_user_id++,
        username: body.username,
        email: body.email || '',
        password: body.password,
        role: 'user',
        avatar: '',
        analysis_count: 0,
        warning_count: 0,
        created_at: new Date().toISOString()
      };
      db.users.push(user);
      saveDB(db);
      return okResponse({ message: '注册成功' });
    }

    if (path === '/api/logout') {
      saveSession(null);
      return okResponse({ message: '已退出登录' });
    }

    if (path === '/api/user') {
      if (!session) return errorResponse('未登录', 401);
      const user = db.users.find(u => u.id === session.user_id);
      if (!user) return errorResponse('用户不存在', 401);
      return okResponse({
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        analysis_count: user.analysis_count,
        warning_count: user.warning_count,
        created_at: user.created_at
      });
    }

    if (path === '/api/user/status') {
      return okResponse({ logged_in: !!session, active: true });
    }

    if (path === '/api/record_activity' && method === 'POST') {
      return okResponse({ message: 'ok' });
    }

    if (path === '/api/change_password' && method === 'POST') {
      return okResponse({ message: '密码修改成功' });
    }

    if (path === '/api/delete_account' && method === 'POST') {
      if (session) {
        db.users = db.users.filter(u => u.id !== session.user_id);
        saveDB(db);
        saveSession(null);
      }
      return okResponse({ message: '账号已删除' });
    }

    if (path === '/api/upload_avatar' && method === 'POST') {
      if (!session) return errorResponse('未登录', 401);
      const user = db.users.find(u => u.id === session.user_id);
      if (user) {
        const formData = options.body;
        if (formData instanceof FormData && formData.has('avatar')) {
          const file = formData.get('avatar');
          // Store as data URL in localStorage (size limited but fine for demo)
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function () {
              user.avatar = reader.result;
              saveDB(db);
              resolve(okResponse({ message: '头像上传成功', avatar: reader.result }));
            };
            reader.readAsDataURL(file);
          });
        }
      }
      return errorResponse('上传失败');
    }

    // ── Achievements ──
    if (path === '/api/user_achievements') {
      if (!session) return errorResponse('未登录', 401);
      const user = db.users.find(u => u.id === session.user_id);
      const analysisCount = user ? user.analysis_count : 0;
      const feedbackCount = db.feedbacks.filter(f => f.user_id === session.user_id).length;
      return okResponse({
        username: user ? user.username : '游客',
        avatar: user ? user.avatar : '',
        analysis_count: analysisCount,
        feedback_count: feedbackCount,
        achievements: [
          { id: 1, name: '初出茅庐', desc: '完成首次水质分析', unlocked: analysisCount >= 1, icon: 'water_drop' },
          { id: 2, name: '勤奋监测员', desc: '完成5次水质分析', unlocked: analysisCount >= 5, icon: 'analytics' },
          { id: 3, name: '环保先锋', desc: '完成10次水质分析', unlocked: analysisCount >= 10, icon: 'eco' },
          { id: 4, name: '反馈达人', desc: '提交3条反馈', unlocked: feedbackCount >= 3, icon: 'feedback' },
          { id: 5, name: '社区之星', desc: '提交5条反馈', unlocked: feedbackCount >= 5, icon: 'star' },
          { id: 6, name: '守护者', desc: '分析次数达到20次', unlocked: analysisCount >= 20, icon: 'shield' },
        ]
      });
    }

    // ── History ──
    if (path === '/api/history') {
      if (!session) return errorResponse('未登录', 401);
      const analysis = db.analysis_results.filter(r => r.user_id === session.user_id);
      const feedbacks = db.feedbacks.filter(f => f.user_id === session.user_id);
      return okResponse({ analysis_results: analysis, feedbacks: feedbacks });
    }

    // ── Feedback ──
    if (path === '/api/feedback' && method === 'POST') {
      if (!session) return errorResponse('未登录', 401);
      const user = db.users.find(u => u.id === session.user_id);
      const fb = {
        id: db.next_feedback_id++,
        user_id: session.user_id,
        username: user ? user.username : '未知',
        location: body.location || '未知地点',
        pollution_level: body.pollution_level || '未知',
        content: body.content || '',
        status: '待核实',
        admin_note: '',
        created_at: new Date().toISOString(),
        likes_count: 0,
        image_path: body.image_data || '',
        urgent_contact_admin: body.urgent_contact_admin || false
      };
      db.feedbacks.unshift(fb);
      saveDB(db);
      return okResponse({ message: '反馈提交成功', id: fb.id });
    }

    if (path === '/api/my_feedbacks') {
      if (!session) return errorResponse('未登录', 401);
      const myFbs = db.feedbacks.filter(f => f.user_id === session.user_id);
      return okResponse(myFbs);
    }

    if (path === '/api/account_feedback' && method === 'POST') {
      const fd = options.body;
      let reason = '', email = '', username = '';
      if (fd instanceof FormData) {
        reason = fd.get('reason') || '';
        email = fd.get('email') || '';
        username = fd.get('username') || (session ? session.username : '');
      } else {
        reason = body.reason || '';
        email = body.email || '';
        username = body.username || '';
      }
      const af = {
        id: db.next_account_feedback_id++,
        username: username,
        email: email,
        reason: reason,
        image_path: '',
        created_at: new Date().toISOString(),
        status: '待处理',
        admin_action: '',
        admin_note: '',
        handled_at: null
      };
      db.account_feedbacks.unshift(af);
      saveDB(db);
      return okResponse({ message: '提交成功' });
    }

    // ── Community ──
    if (path === '/api/community/stats') {
      const total = db.feedbacks.length;
      const verified = db.feedbacks.filter(f => f.status === '已核实').length;
      const pending = db.feedbacks.filter(f => f.status === '待核实').length;
      const heavy = db.feedbacks.filter(f => ['重度', '非常严重'].includes(f.pollution_level)).length;
      return okResponse({
        total_feedbacks: total,
        verified: verified,
        pending: pending,
        heavy_pollution: heavy,
        level_distribution: {
          '无污染': db.feedbacks.filter(f => f.pollution_level === '无污染').length,
          '轻微': db.feedbacks.filter(f => f.pollution_level === '轻微').length,
          '轻度': db.feedbacks.filter(f => f.pollution_level === '轻度').length,
          '中度': db.feedbacks.filter(f => f.pollution_level === '中度').length,
          '重度': db.feedbacks.filter(f => f.pollution_level === '重度').length,
          '非常严重': db.feedbacks.filter(f => f.pollution_level === '非常严重').length,
        }
      });
    }

    if (path === '/api/community/feedbacks') {
      return okResponse(db.feedbacks);
    }

    if (path === '/api/community/feedbacks/like' && method === 'POST') {
      const fb = db.feedbacks.find(f => f.id === body.id);
      if (fb) {
        fb.likes_count = Math.max(0, fb.likes_count + (body.inc ? 1 : -1));
        saveDB(db);
      }
      return okResponse({ likes_count: fb ? fb.likes_count : 0 });
    }

    // ── Analysis ──
    if (path === '/api/analysis_result' && method === 'POST') {
      if (!session) return errorResponse('未登录', 401);
      const user = db.users.find(u => u.id === session.user_id);
      const ar = {
        id: db.next_analysis_id++,
        user_id: session.user_id,
        username: user ? user.username : '未知',
        result: body.result || '{}',
        analysis_time: new Date().toISOString(),
        image_path: body.image_data || ''
      };
      db.analysis_results.unshift(ar);
      if (user) {
        user.analysis_count = (user.analysis_count || 0) + 1;
      }
      saveDB(db);
      return okResponse({ message: '保存成功', id: ar.id });
    }

    if (path === '/api/increment_analysis' && method === 'POST') {
      if (session) {
        const user = db.users.find(u => u.id === session.user_id);
        if (user) {
          user.analysis_count = (user.analysis_count || 0) + 1;
          saveDB(db);
        }
      }
      return okResponse({ message: 'ok' });
    }

    // ── Email (mock all as success) ──
    if (path === '/api/send_code' && method === 'POST') {
      return okResponse({ message: '验证码已发送（演示模式：任意6位数字即可）' });
    }
    if (path === '/api/reset_password' && method === 'POST') {
      return okResponse({ message: '密码重置成功' });
    }
    if (path === '/api/save_email_config' && method === 'POST') {
      return okResponse({ message: '保存成功' });
    }
    if (path === '/api/send_verification_code' && method === 'POST') {
      return okResponse({ message: '验证码已发送（演示模式：任意验证码即可）' });
    }
    if (path === '/api/bind_email' && method === 'POST') {
      return okResponse({ message: '邮箱绑定成功' });
    }
    if (path === '/api/get_user_info') {
      if (!session) return errorResponse('未登录', 401);
      const user = db.users.find(u => u.id === session.user_id);
      return okResponse({ username: user.username, email: user.email });
    }
    if (path === '/api/get_email_config') {
      return okResponse({ mail_server: '', mail_port: 587, mail_username: '', user_email: '', verified: false });
    }

    // ── Admin: Users ──
    if (path === '/api/admin/users') {
      if (!session || session.role !== 'admin') return errorResponse('无权限', 403);
      return okResponse(db.users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
        analysis_count: u.analysis_count || 0,
        warning_count: u.warning_count || 0,
        last_active_at: u.last_active_at || null,
        banned_until: u.banned_until || null,
        ban_reason: u.ban_reason || null,
        created_at: u.created_at
      })));
    }

    if (path.match(/^\/api\/admin\/warn_user\/\d+$/) && method === 'POST') {
      const id = parseInt(path.match(/\d+/)[0]);
      const user = db.users.find(u => u.id === id);
      if (user) {
        user.warning_count = (user.warning_count || 0) + 1;
        saveDB(db);
      }
      return okResponse({ message: '警告已发送' });
    }

    if (path === '/api/admin/ban_user' && method === 'POST') {
      const user = db.users.find(u => u.id === body.user_id);
      if (user) {
        user.banned_until = new Date(Date.now() + (body.duration || 1) * 86400000).toISOString();
        user.ban_reason = body.reason || '管理员封禁';
        saveDB(db);
      }
      return okResponse({ message: '用户已封禁' });
    }

    if (path.match(/^\/api\/admin\/delete_user\/\d+$/) && method === 'DELETE') {
      const id = parseInt(path.match(/\d+/)[0]);
      db.users = db.users.filter(u => u.id !== id);
      db.feedbacks = db.feedbacks.filter(f => f.user_id !== id);
      db.analysis_results = db.analysis_results.filter(r => r.user_id !== id);
      saveDB(db);
      return okResponse({ message: '用户已删除' });
    }

    if (path === '/api/admin/delete_user_by_username' && method === 'POST') {
      db.users = db.users.filter(u => u.username !== body.username);
      saveDB(db);
      return okResponse({ message: '用户已删除' });
    }

    // ── Admin: Feedbacks ──
    if (path === '/api/admin/feedbacks' && method === 'GET') {
      if (!session || session.role !== 'admin') return errorResponse('无权限', 403);
      return okResponse(db.feedbacks);
    }

    if (path === '/api/admin/feedbacks/query' && method === 'POST') {
      if (!session || session.role !== 'admin') return errorResponse('无权限', 403);
      let results = db.feedbacks.slice();
      if (body.status) results = results.filter(f => f.status === body.status);
      if (body.pollution_level) results = results.filter(f => f.pollution_level === body.pollution_level);
      if (body.keyword) results = results.filter(f => f.content.includes(body.keyword) || f.location.includes(body.keyword));
      const page = body.page || 1;
      const pageSize = body.page_size || 10;
      const start = (page - 1) * pageSize;
      return okResponse({
        data: results.slice(start, start + pageSize),
        total: results.length,
        page: page,
        page_size: pageSize
      });
    }

    if (path === '/api/admin/feedbacks/stats' && method === 'POST') {
      if (!session || session.role !== 'admin') return errorResponse('无权限', 403);
      return okResponse({
        total: db.feedbacks.length,
        verified: db.feedbacks.filter(f => f.status === '已核实').length,
        pending: db.feedbacks.filter(f => f.status === '待核实').length,
        rejected: db.feedbacks.filter(f => f.status === '不予处理').length,
      });
    }

    if (path === '/api/admin/feedbacks/export' && method === 'POST') {
      return okResponse({ csv: 'id,username,location,pollution_level,content,status\n' + db.feedbacks.map(f => `${f.id},${f.username},${f.location},${f.pollution_level},${f.content},${f.status}`).join('\n') });
    }

    if (path === '/api/admin/feedbacks/delete' && method === 'POST') {
      const ids = body.ids || [];
      db.feedbacks = db.feedbacks.filter(f => !ids.includes(f.id));
      saveDB(db);
      return okResponse({ message: '删除成功', deleted: ids.length });
    }

    if (path === '/api/admin/feedbacks/update' && method === 'POST') {
      const ids = body.ids || [];
      db.feedbacks.forEach(f => {
        if (ids.includes(f.id)) {
          if (body.status) f.status = body.status;
          if (body.admin_note !== undefined) f.admin_note = body.admin_note;
        }
      });
      saveDB(db);
      return okResponse({ message: '更新成功' });
    }

    // ── Admin: Analysis Results ──
    if (path === '/api/admin/analysis_results/query' && method === 'POST') {
      if (!session || session.role !== 'admin') return errorResponse('无权限', 403);
      let results = db.analysis_results.slice();
      const page = body.page || 1;
      const pageSize = body.page_size || 10;
      const start = (page - 1) * pageSize;
      return okResponse({
        data: results.slice(start, start + pageSize),
        total: results.length,
        page: page,
        page_size: pageSize
      });
    }

    if (path === '/api/admin/analysis_results/stats' && method === 'POST') {
      if (!session || session.role !== 'admin') return errorResponse('无权限', 403);
      return okResponse({
        total: db.analysis_results.length,
        avg_score: 65,
      });
    }

    if (path === '/api/admin/analysis_results/delete' && method === 'POST') {
      const ids = body.ids || [];
      db.analysis_results = db.analysis_results.filter(r => !ids.includes(r.id));
      saveDB(db);
      return okResponse({ message: '删除成功', deleted: ids.length });
    }

    // ── Admin: Account Feedbacks ──
    if (path === '/api/admin/account_feedbacks' && method === 'GET') {
      if (!session || session.role !== 'admin') return errorResponse('无权限', 403);
      return okResponse(db.account_feedbacks);
    }

    if (path.match(/^\/api\/admin\/account_feedbacks\/\d+$/) && method === 'DELETE') {
      const id = parseInt(path.match(/\d+/)[0]);
      db.account_feedbacks = db.account_feedbacks.filter(a => a.id !== id);
      saveDB(db);
      return okResponse({ message: '删除成功' });
    }

    if (path === '/api/admin/account_feedbacks/action' && method === 'POST') {
      const af = db.account_feedbacks.find(a => a.id === body.id);
      if (af) {
        af.admin_action = body.action || '';
        af.admin_note = body.admin_note || '';
        af.status = '已处理';
        af.handled_at = new Date().toISOString();
        saveDB(db);
      }
      return okResponse({ message: '操作成功' });
    }

    // ── Fallback ──
    console.warn('[MockAPI] Unhandled route:', method, path);
    return okResponse({ message: 'ok' });
  }

  // ── Mock AI analysis (replaces Volcano Engine API for demo) ──
  function mockAIAnalysis() {
    const results = [
      { waterQuality: '良好', pollutionLevel: '无污染', pollutionTypes: [], transparency: '清澈', color: '正常', visualObservation: '水体清澈透明，无明显污染迹象，水面无漂浮物。', possibleCauses: '该河段水质良好，周边生态环境保护到位，无工业排放源。', suggestions: '继续保持现有水质监测频率，定期巡查防止突发污染。', score: 88 },
      { waterQuality: '轻度污染', pollutionLevel: '轻度', pollutionTypes: ['悬浮物', '藻类异常'], transparency: '半透明', color: '偏绿', visualObservation: '水体略带绿色，可见少量悬浮颗粒物和藻类增殖迹象。', possibleCauses: '上游可能有农业面源污染或生活污水排入，导致富营养化。', suggestions: '建议加强上游排污口排查，控制氮磷排放，定期打捞藻类。', score: 65 },
      { waterQuality: '中度污染', pollutionLevel: '中度', pollutionTypes: ['悬浮物', '油污', '垃圾漂浮物'], transparency: '浑浊', color: '偏黄', visualObservation: '水体浑浊呈黄褐色，表面可见油膜和少量漂浮垃圾。', possibleCauses: '附近可能存在工业废水排放或施工工地水土流失。', suggestions: '需立即排查上游排污企业，清理水面漂浮物，加强施工工地管理。', score: 42 },
      { waterQuality: '良好', pollutionLevel: '轻微', pollutionTypes: ['悬浮物'], transparency: '清澈', color: '正常', visualObservation: '水体整体清澈，仅底部可见少量悬浮沉积物。', possibleCauses: '属自然沉积现象，水质指标在正常范围内。', suggestions: '维持日常监测即可，无需特别处理。', score: 82 },
    ];
    const pick = results[Math.floor(Math.random() * results.length)];
    const content = JSON.stringify(pick);
    return Promise.resolve(new Response(JSON.stringify({
      output: [{
        type: 'message',
        content: [{ type: 'output_text', text: content }]
      }],
      usage: { input_tokens: 500, output_tokens: 100, output_tokens_details: { reasoning_tokens: 0 } }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }

  // ── Intercept fetch ──
  const originalFetch = window.fetch;
  window.fetch = function (input, options) {
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    // Intercept local /api/ calls
    if (url.includes('/api/') && !url.includes('volces.com')) {
      return handleApi(url, options);
    }

    // Intercept Volcano Engine AI API for demo (no real API key needed)
    if (url.includes('volces.com') || url.includes('ark.cn-beijing')) {
      return mockAIAnalysis();
    }

    // Pass through other external requests
    return originalFetch(input, options);
  };

  // ── Guest login helper (exposed globally) ──
  window.guestLogin = function () {
    const db = getDB();
    let guest = db.users.find(u => u.username === '游客用户');
    if (!guest) {
      guest = {
        id: db.next_user_id++,
        username: '游客用户',
        email: 'guest@demo.com',
        password: '',
        role: 'user',
        avatar: '',
        analysis_count: 0,
        warning_count: 0,
        created_at: new Date().toISOString()
      };
      db.users.push(guest);
      saveDB(db);
    }
    saveSession({ user_id: guest.id, username: guest.username, role: guest.role });
    window.location.href = 'Untitled-1.html';
  };

  console.log('[MockAPI] Initialized. All /api/ calls will be handled locally.');
})();
