import { useState } from 'react';
import { Toast } from 'antd-mobile';
import config from '../config';
import { getDeviceId } from '../utils/device';

export default function useMessage() {
	// 加载状态
	const [loading, setLoading] = useState(false);
	// 是否完成
	const [isFinish, setFinish] = useState(false);
	// 回答
	const [answer, setAnswer] = useState('');
	// 错误
	const [error, setError] = useState();
	// 加载方法
	async function fetchPrompt(prompt) {
		if (loading || !prompt.trim()) return;
		setFinish(false);
		setLoading(true);
		setAnswer('');
		ask({
			prompt,
			onData: data => {
				setAnswer(data);
			},
			onDone: () => {
				setLoading(false);
				setFinish(true);
			},
			onFail: e => {
				setError(e);
				setLoading(false);
				setFinish(true);
			}
		});
	}
	return {
		loading,
		isFinish,
		answer,
		error,
		fetchPrompt,
	};
}

// 提问
function ask({ prompt, onData, onDone, onFail }) {
	let resp = '';
	const sse = new EventSource(`${config.baseUrl}/ask?prompt=${encodeURIComponent(prompt)}&did=${getDeviceId()}`, { withCredentials: true });
	const handleMessage = e => {
		try {
			resp = JSON.parse(e.data).message;
		} catch (e) {
			resp = e.data;
		}
		if (typeof onData === 'function') onData(resp);
	};
	const handleDone = () => {
		// 如果拿不到响应就直接抛错
		if (!resp) return handleFail();
		sse.close();
		if (typeof onDone === 'function') onDone(resp);
	};
	const handleFail = e => {
		const errorMsg = e?.data || '未知错误，请稍后重试';
		Toast.show(errorMsg);
		sse.close();
		if (typeof onFail === 'function') onFail(errorMsg);
	};
	sse.addEventListener('message', handleMessage);
	sse.addEventListener('done', handleDone);
	sse.addEventListener('fail', handleFail);
	sse.addEventListener('error', handleFail);
	return function() {
		sse.removeEventListener('message', handleMessage);
		sse.removeEventListener('done', handleDone);
		sse.removeEventListener('fail', handleFail);
		sse.removeEventListener('error', handleFail);
	};
}