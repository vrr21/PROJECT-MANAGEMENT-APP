import React, { useEffect, useState, useCallback } from 'react';
import {
  message,
  ConfigProvider,
  theme,
  App,
  Tabs,
  Table,
  Avatar,
  Tooltip,
  Modal,
  Button,
} from 'antd';
import {
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/useAuth';
import HeaderEmployee from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import dayjs from 'dayjs';
import '../styles/pages/EmployeeDashboard.css';
import { Input, List } from 'antd';
import { MessageOutlined } from '@ant-design/icons';




const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface Employee {
  ID_Employee: number;
  Full_Name?: string;
  Avatar?: string;
}

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
  Order_Name: string;
  Team_Name: string;
  Deadline?: string | null;
  Employees: Employee[];
  attachments?: string[];
}
interface CommentType {
  ID_Comment: number;
  CommentText: string;
  Created_At: string;
  AuthorName: string;
  Avatar?: string;
}

const statuses = ['Новая', 'В работе', 'Завершена', 'Выполнена'];

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('kanban');
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const openCommentsModal = (task: Task) => {
    setViewingTask(task);
    setIsCommentsModalVisible(true);
    fetchComments(task.ID_Task);
  };
  
  const [newComment, setNewComment] = useState('');
  
  
  const fetchComments = async (taskId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/comments/${taskId}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Ошибка при получении комментариев:', error);
    }
  };
  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTask || !user?.id) return;
  
    try {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: viewingTask.ID_Task,
          userId: user.id,
          commentText: newComment.trim(),
        }),
      });
  
      if (!response.ok) throw new Error();
      setNewComment('');
      fetchComments(viewingTask.ID_Task);
    } catch (error) {
      console.error('Ошибка при добавлении комментария:', error);
    }
  };
  
  useEffect(() => {
    if (viewingTask) {
      fetchComments(viewingTask.ID_Task);
    }
  }, [viewingTask]);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingTask?.ID_Task) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', viewingTask.ID_Task.toString());

    setSelectedFileName(file.name);

    try {
      const response = await fetch(`${API_URL}/api/upload-task`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Ошибка загрузки');

      const data = await response.json();
      messageApi.success('Файл загружен: ' + data.filename);
      fetchTasks(); // обновим задачи после загрузки
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка загрузки файла');
    }
  };

  const getInitials = (fullName: string = '') => {
    const [first, second] = fullName.split(' ');
    return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase();
  };

  const fetchTasks = useCallback(async () => {
    try {
      const url = `${API_URL}/api/tasks?employee=${user?.id}`;
      const response = await fetch(url);
      const data: Task[] = await response.json();

      const grouped: Record<string, Task[]> = {};
      statuses.forEach((status) => {
        grouped[status] = data.filter((task) => task.Status_Name === status);
      });
      setColumns(grouped);
    } catch {
      messageApi.error('Не удалось загрузить задачи');
    }
  }, [user?.id, messageApi]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId, 10);
    const updatedStatus = destination.droppableId;

    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status_Name: updatedStatus }),
      });
      fetchTasks();
    } catch {
      messageApi.error('Ошибка при изменении статуса задачи');
    }
  };

  const renderEmployees = (employees: Employee[]) => {
    if (!employees?.length) return '—';
    return (
      <Avatar.Group max={{ count: 3 }}>
        {employees.map((emp) => (
          <Tooltip key={emp.ID_Employee} title={emp.Full_Name || '—'}>
            <Avatar
              src={emp.Avatar ? `${API_URL}/uploads/${emp.Avatar}` : undefined}
              style={{ backgroundColor: emp.Avatar ? 'transparent' : '#777' }}
              icon={!emp.Avatar ? <UserOutlined /> : undefined}
            >
              {!emp.Avatar && getInitials(emp.Full_Name || '')}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>
    );
  };

  const getDeadlineClass = (deadline: string) => {
    const now = dayjs();
    const time = dayjs(deadline);
    if (time.isBefore(now)) return 'expired';
    if (time.diff(now, 'hour') <= 24) return 'warning';
    return 'safe';
  };

  const renderDeadlineBox = (deadline: string | null | undefined) => {
    if (!deadline) {
      return (
        <div className="deadline-box undefined">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          Без срока
        </div>
      );
    }

    const time = dayjs(deadline);
    const now = dayjs();
    const diffDays = time.diff(now, 'day');
    const diffHours = time.diff(now, 'hour');

    let label = '';
    if (diffDays > 0) label = `Осталось ${diffDays} дн`;
    else if (diffHours > 0) label = `Осталось ${diffHours} ч`;
    else label = 'Срок истёк';

    return (
      <div className={`deadline-box ${getDeadlineClass(deadline)}`}>
        <ClockCircleOutlined style={{ marginRight: 6 }} />
        {label}
      </div>
    );
  };

  const tableColumns = [
    { title: 'Проект', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Название задачи', dataIndex: 'Task_Name', key: 'Task_Name' },
    { title: 'Описание', dataIndex: 'Description', key: 'Description' },
    { title: 'Норма времени (часы)', dataIndex: 'Time_Norm', key: 'Time_Norm' },
    { title: 'Статус', dataIndex: 'Status_Name', key: 'Status_Name' },
    {
      title: 'Дедлайн',
      dataIndex: 'Deadline',
      key: 'Deadline',
      render: (val: string | null) =>
        val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: 'Сотрудники',
      dataIndex: 'Employees',
      key: 'Employees',
      render: renderEmployees,
    },
  ];

  const openViewModal = (task: Task) => setViewingTask(task);
  const closeViewModal = () => setViewingTask(null);

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        <div className="dashboard">
          <HeaderEmployee />
          <div className="dashboard-body">
            <Sidebar role="employee" />
            <main className="main-content kanban-board">
              <h2 className="dashboard-title">Мои задачи</h2>
              {contextHolder}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                items={[
                  {
                    label: 'Kanban-доска',
                    key: 'kanban',
                    children: (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <div className="kanban-columns">
                          {statuses.map((status) => (
                            <Droppable key={status} droppableId={status}>
                              {(provided) => (
                                <div
                                  className="kanban-column"
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                >
                                  <h3>{status}</h3>
                                  {(columns[status] || []).map((task, index) => (
                                    <Draggable
                                      key={`${task.ID_Task}`}
                                      draggableId={`${task.ID_Task}`}
                                      index={index}
                                    >
                                      {(providedDraggable) => (
                                        <div
                                          className="kanban-task"
                                          ref={providedDraggable.innerRef}
                                          {...providedDraggable.draggableProps}
                                          {...providedDraggable.dragHandleProps}
                                        >
                                          <div className="kanban-task-content">
                                            <strong>{task.Task_Name}</strong>
                                            <p>{task.Description}</p>
                                            <p><i>Проект:</i> {task.Order_Name}</p>
                                            <p><i>Норма времени:</i> {task.Time_Norm} ч</p>

                                            <div className="task-footer">
                                            <Button
  type="text"
  icon={<EyeOutlined className="kanban-icon" />}
  onClick={() => openViewModal(task)}
  style={{ padding: 0, marginRight: 8 }}
/>

<Button
  type="text"
  icon={<MessageOutlined className="kanban-icon" />}
  onClick={() => openCommentsModal(task)}
  style={{ padding: 0 }}
/>


  {renderDeadlineBox(task.Deadline)}
</div>


                                            <div className="kanban-avatars">
                                              {renderEmployees(task.Employees)}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          ))}
                        </div>
                      </DragDropContext>
                    ),
                  },
                  {
                    label: 'Список задач (таблица)',
                    key: 'table',
                    children: (
                      <Table
                        dataSource={Object.values(columns).flat()}
                        columns={tableColumns}
                        rowKey="ID_Task"
                      />
                    ),
                  },
                ]}
              />

              <Modal
                title="Информация о задаче"
                open={!!viewingTask}
                onCancel={closeViewModal}
                footer={[
                  <Button key="close" onClick={closeViewModal}>
                    Закрыть
                  </Button>,
                ]}
              >
                {viewingTask && (
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    <p><strong>Название:</strong> {viewingTask.Task_Name}</p>
                    <p><strong>Описание:</strong> {viewingTask.Description}</p>
                    <p><strong>Проект:</strong> {viewingTask.Order_Name}</p>
                    <p><strong>Команда:</strong> {viewingTask.Team_Name || '—'}</p>
                    <p><strong>Статус:</strong> {viewingTask.Status_Name}</p>
                    <p><strong>Дедлайн:</strong> {viewingTask.Deadline ? dayjs(viewingTask.Deadline).format('YYYY-MM-DD HH:mm') : '—'}</p>
                    <p><strong>Норма времени:</strong> {viewingTask.Time_Norm} ч.</p>

                    <p><strong>Сотрудники:</strong></p>
                    <div className="kanban-avatars">
                      {viewingTask.Employees.map((emp, idx) => (
                        <Tooltip key={`emp-view-${emp.ID_Employee}-${idx}`} title={emp.Full_Name}>
                          <Avatar
                            src={emp.Avatar ? `${API_URL}/uploads/${emp.Avatar}` : undefined}
                            icon={!emp.Avatar ? <UserOutlined /> : undefined}
                            style={{ backgroundColor: emp.Avatar ? 'transparent' : '#777', marginRight: 4 }}
                          >
                            {!emp.Avatar && getInitials(emp.Full_Name)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </div>

                    {viewingTask.attachments && viewingTask.attachments.length > 0 && (
                      <>
                        <p><strong>Файлы:</strong></p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {viewingTask.attachments.map((filename: string, idx: number) => (
                            <a
                              key={`att-${idx}`}
                              href={`${API_URL}/uploads/${filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                backgroundColor: '#2a2a2a',
                                color: '#fff',
                                textDecoration: 'none',
                                padding: '4px 8px',
                                borderRadius: 4,
                                fontSize: 12
                              }}
                            >
                              📎 {filename}
                            </a>
                          ))}
                        </div>
                      </>
                    )}

                    <p style={{ marginTop: '1rem' }}><strong>Загрузить новый файл:</strong></p>
                    <label
                      htmlFor="employee-upload"
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        backgroundColor: '#1f1f1f',
                        color: '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: '1px solid #444',
                        fontSize: '13px'
                      }}
                    >
                      📤 Выберите файл
                    </label>
                    <input
                      id="employee-upload"
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    {selectedFileName && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#aaa' }}>
                        🗂 Загружено: <strong>{selectedFileName}</strong>
                      </div>
                    )}
                  </div>
                )}
              </Modal>
              <Modal
  title="Комментарии к задаче"
  open={isCommentsModalVisible}
  onCancel={() => setIsCommentsModalVisible(false)}
  footer={null}
>
  {viewingTask && (
    <>
      <h3 style={{ marginTop: 0 }}>Комментарии:</h3>
      <List
        className="comment-list"
        header={`${comments.length} комментариев`}
        itemLayout="horizontal"
        dataSource={comments}
        renderItem={(item: CommentType) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar
                  src={item.Avatar ? `${API_URL}/uploads/${item.Avatar}` : undefined}
                  icon={!item.Avatar ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: item.Avatar ? 'transparent' : '#777' }}
                />
              }
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.AuthorName}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>
                    {dayjs(item.Created_At).format('YYYY-MM-DD HH:mm')}
                  </span>
                </div>
              }
              description={item.CommentText}
            />
          </List.Item>
        )}
      />
      <Input.TextArea
        rows={3}
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Введите комментарий..."
        style={{ marginTop: 8 }}
      />
      <Button
        type="primary"
        onClick={handleAddComment}
        disabled={!newComment.trim()}
        style={{ marginTop: 8 }}
        block
      >
        Добавить комментарий
      </Button>
    </>
  )}
</Modal>

            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default EmployeeDashboard;
