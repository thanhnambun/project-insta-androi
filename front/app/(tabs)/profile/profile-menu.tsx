import { useLogoutMutation } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const MENU_W = width * 0.7;

export default function ProfileMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const slideAnim = React.useRef(new Animated.Value(MENU_W)).current;
  const logoutMutation = useLogoutMutation();
  const router = useRouter();

  React.useEffect(() => {
    if (Platform.OS === "web") {
      slideAnim.setValue(visible ? 0 : MENU_W);
    } else {
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : MENU_W,
        duration: 250,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [visible, slideAnim]);

  const handleLogout = () => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn đăng xuất không?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  };

  const goToFollowRequests = () => {
    onClose();
    setTimeout(() => router.push("/(tabs)/profile/follow-requests"), 200);
  };

  const goToMessages = () => {
    onClose();
    setTimeout(() => router.push("/message"), 200);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none" // tránh fade + slide cùng lúc
      onRequestClose={onClose} // Android back
    >
      <View style={styles.root} pointerEvents="box-none">
        {/* lớp mờ phía sau – bấm để đóng */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* menu tách riêng, không bị overlay bắt touch */}
        <Animated.View
          style={[
            styles.menuContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.username}>s.khasanov_</Text>
          </View>

          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={goToMessages}>
              <Ionicons name="chatbubble-outline" size={22} color="#000" />
              <Text style={styles.menuText}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={goToFollowRequests}
            >
              <Ionicons name="person-outline" size={22} color="#000" />
              <Text style={styles.menuText}>Friend Requests</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.menuItem, styles.setting]}>
            <Ionicons name="settings-outline" size={22} color="#000" />
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logout]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
            <Text style={[styles.menuText, { color: "#e74c3c" }]}>Log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menuContainer: {
    backgroundColor: "#fff",
    width: MENU_W,
    height: "100%",
    paddingHorizontal: 20,
    paddingTop: 60,
    // đảm bảo nổi trên backdrop
    zIndex: 2,
    elevation: 2,
  },
  header: { marginBottom: 20 },
  username: { fontSize: 18, fontWeight: "600" },
  menu: { flexGrow: 1 },
  menuItem: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  menuText: { fontSize: 16, marginLeft: 12 },
  setting: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 15,
    marginTop: 20,
  },
  logout: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 15,
    marginTop: 10,
  },
});
